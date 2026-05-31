use napi::bindgen_prelude::*;
use napi::threadsafe_function::{
    ThreadSafeCallContext, ThreadsafeFunction, ThreadsafeFunctionCallMode,
};
use napi_derive::napi;
use std::ffi::{c_char, c_void, CStr, CString};
use std::sync::atomic::{AtomicPtr, AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use tokio::sync::oneshot;

// ── C API Function Signatures ──────────────────────────────────────────────

#[repr(C)]
pub struct NtgAsyncStruct {
    pub user_data: *mut c_void,
    pub error_code: *mut i32,
    pub error_message: *mut *mut c_char,
    pub promise: Option<unsafe extern "C" fn(*mut c_void)>,
}

unsafe impl Send for NtgAsyncStruct {}
unsafe impl Sync for NtgAsyncStruct {}

#[repr(C)]
pub struct NtgAudioDescriptionStruct {
    pub media_source: i32,
    pub input: *const c_char,
    pub sample_rate: u32,
    pub channel_count: u8,
    pub keep_open: bool,
}

unsafe impl Send for NtgAudioDescriptionStruct {}
unsafe impl Sync for NtgAudioDescriptionStruct {}

#[repr(C)]
pub struct NtgVideoDescriptionStruct {
    pub width: i16,
    pub height: i16,
    pub fps: u8,
    pub keep_open: bool,
}

#[repr(C)]
pub struct NtgMediaDescriptionStruct {
    pub microphone: *const NtgAudioDescriptionStruct,
    pub speaker: *const NtgAudioDescriptionStruct,
    pub camera: *const NtgVideoDescriptionStruct,
    pub screen: *const NtgVideoDescriptionStruct,
}

unsafe impl Send for NtgMediaDescriptionStruct {}
unsafe impl Sync for NtgMediaDescriptionStruct {}

pub type NtgStreamCallback = unsafe extern "C" fn(
    pointer: usize,
    chat_id: i64,
    stream_type: i32,
    stream_device: i32,
    user_data: *mut c_void,
);

pub type NtgConnectionCallback =
    unsafe extern "C" fn(pointer: usize, chat_id: i64, info: u64, user_data: *mut c_void);

extern "C" {
    pub fn ntg_init() -> usize;
    pub fn ntg_destroy(ptr: usize) -> i32;

    pub fn ntg_create(
        ptr: usize,
        chat_id: i64,
        buffer: *mut *mut c_char,
        future: NtgAsyncStruct,
    ) -> i32;
    pub fn ntg_connect(
        ptr: usize,
        chat_id: i64,
        params: *const c_char,
        is_presentation: bool,
        future: NtgAsyncStruct,
    ) -> i32;
    pub fn ntg_set_stream_sources(
        ptr: usize,
        chat_id: i64,
        mode: i32,
        desc: NtgMediaDescriptionStruct,
        future: NtgAsyncStruct,
    ) -> i32;
    pub fn ntg_pause(ptr: usize, chat_id: i64, future: NtgAsyncStruct) -> i32;
    pub fn ntg_resume(ptr: usize, chat_id: i64, future: NtgAsyncStruct) -> i32;
    pub fn ntg_mute(ptr: usize, chat_id: i64, future: NtgAsyncStruct) -> i32;
    pub fn ntg_unmute(ptr: usize, chat_id: i64, future: NtgAsyncStruct) -> i32;
    pub fn ntg_stop(ptr: usize, chat_id: i64, future: NtgAsyncStruct) -> i32;

    pub fn ntg_on_stream_end(ptr: usize, cb: NtgStreamCallback, user_data: *mut c_void) -> i32;
    pub fn ntg_on_connection_change(
        ptr: usize,
        cb: NtgConnectionCallback,
        user_data: *mut c_void,
    ) -> i32;

    pub fn free(ptr: *mut c_void);
}

// ── Async Context & Callbacks ────────────────────────────────────────────────

struct AsyncContext {
    tx: oneshot::Sender<std::result::Result<Option<String>, String>>,
    error_code: i32,
    error_message: *mut c_char,
    result_buffer: *mut c_char,
    // Keeps async FFI parameters alive until the callback runs
    _keep_alive: Option<Box<dyn std::any::Any + Send + Sync>>,
}

unsafe extern "C" fn rust_async_callback(user_data: *mut c_void) {
    if user_data.is_null() {
        return;
    }

    let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        // Acquire fence: ensures the C library's writes to error_code/error_message/result_buffer
        // are visible to this thread.
        std::sync::atomic::fence(Ordering::Acquire);
        let context = Box::from_raw(user_data as *mut AsyncContext);

        if context.error_code == 0 {
            let mut res = None;
            if !context.result_buffer.is_null() {
                let c_str = CStr::from_ptr(context.result_buffer);
                res = Some(c_str.to_string_lossy().into_owned());
                free(context.result_buffer as *mut c_void);
            }
            let _ = context.tx.send(Ok(res));
        } else {
            let err_msg = if !context.error_message.is_null() {
                let c_str = CStr::from_ptr(context.error_message);
                let msg = c_str.to_string_lossy().into_owned();
                free(context.error_message as *mut c_void);
                msg
            } else {
                format!("NTgCalls async error code: {}", context.error_code)
            };
            let _ = context.tx.send(Err(err_msg));
        }
    }));
}

// ── Connection Callbacks ─────────────────────────────────────────────────────

unsafe extern "C" fn raw_stream_end_callback(
    _pointer: usize,
    chat_id: i64,
    _stream_type: i32,
    _stream_device: i32,
    user_data: *mut c_void,
) {
    if user_data.is_null() {
        return;
    }
    let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let mutex_ptr = user_data as *const Mutex<Option<ThreadsafeFunction<i64>>>;
        if let Ok(guard) = (*mutex_ptr).lock() {
            if let Some(tsfn) = guard.as_ref() {
                tsfn.call(Ok(chat_id), ThreadsafeFunctionCallMode::NonBlocking);
            }
        }
    }));
}

unsafe extern "C" fn raw_connection_callback(
    _pointer: usize,
    chat_id: i64,
    info: u64,
    user_data: *mut c_void,
) {
    if user_data.is_null() {
        return;
    }
    let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let mutex_ptr = user_data as *const Mutex<Option<ThreadsafeFunction<Vec<i64>>>>;
        if let Ok(guard) = (*mutex_ptr).lock() {
            if let Some(tsfn) = guard.as_ref() {
                let kind = (info & 0xffff) as i32;
                let state = ((info >> 16) & 0xffff) as i32;
                let event_data = vec![chat_id, kind as i64, state as i64];
                tsfn.call(Ok(event_data), ThreadsafeFunctionCallMode::NonBlocking);
            }
        }
    }));
}

// ── NtgCalls Class ───────────────────────────────────────────────────────────

#[napi]
pub struct NtgCalls {
    handle: usize,
    stream_end_cb: Arc<Mutex<Option<ThreadsafeFunction<i64>>>>,
    connection_cb: Arc<Mutex<Option<ThreadsafeFunction<Vec<i64>>>>>,
    stream_end_cb_ptr: AtomicPtr<Mutex<Option<ThreadsafeFunction<i64>>>>,
    connection_cb_ptr: AtomicPtr<Mutex<Option<ThreadsafeFunction<Vec<i64>>>>>,
    pending_ops: Arc<AtomicUsize>,
}

#[napi]
impl NtgCalls {
    #[napi(constructor)]
    pub fn new() -> Result<Self> {
        let handle = unsafe { ntg_init() };
        if handle == 0 {
            return Err(Error::from_reason("Failed to initialize NTgCalls handle"));
        }

        Ok(Self {
            handle,
            stream_end_cb: Arc::new(Mutex::new(None)),
            connection_cb: Arc::new(Mutex::new(None)),
            stream_end_cb_ptr: AtomicPtr::new(std::ptr::null_mut()),
            connection_cb_ptr: AtomicPtr::new(std::ptr::null_mut()),
            pending_ops: Arc::new(AtomicUsize::new(0)),
        })
    }

    #[napi(js_name = "on_stream_end")]
    pub fn on_stream_end(
        &self,
        #[napi(ts_arg_type = "(chatId: bigint) => void")] cb: JsFunction,
    ) -> Result<()> {
        let tsfn: ThreadsafeFunction<i64> =
            cb.create_threadsafe_function(0, |ctx: ThreadSafeCallContext<i64>| {
                let js_chat_id = ctx.env.create_bigint_from_i64(ctx.value)?.into_unknown()?;
                Ok(vec![js_chat_id])
            })?;

        let mut guard = self
            .stream_end_cb
            .lock()
            .map_err(|_| Error::from_reason("Mutex poisoned"))?;
        *guard = Some(tsfn);
        drop(guard);

        // Register callback exactly once with C library to avoid UAF on updates.
        if self.stream_end_cb_ptr.load(Ordering::Acquire).is_null() {
            let leaked = Arc::into_raw(Arc::clone(&self.stream_end_cb)) as *mut _;
            if self
                .stream_end_cb_ptr
                .compare_exchange(
                    std::ptr::null_mut(),
                    leaked,
                    Ordering::AcqRel,
                    Ordering::Acquire,
                )
                .is_ok()
            {
                unsafe {
                    ntg_on_stream_end(self.handle, raw_stream_end_callback, leaked as *mut c_void);
                }
            } else {
                // Already registered by another thread, drop the extra leaked Arc.
                unsafe {
                    drop(Arc::from_raw(leaked));
                }
            }
        }

        Ok(())
    }

    #[napi(js_name = "on_connection_change")]
    pub fn on_connection_change(
        &self,
        #[napi(ts_arg_type = "(chatId: bigint, kind: number, state: number) => void")]
        cb: JsFunction,
    ) -> Result<()> {
        let tsfn: ThreadsafeFunction<Vec<i64>> =
            cb.create_threadsafe_function(0, |ctx: ThreadSafeCallContext<Vec<i64>>| {
                let chat_id = ctx
                    .env
                    .create_bigint_from_i64(ctx.value[0])?
                    .into_unknown()?;
                let kind = ctx.env.create_int32(ctx.value[1] as i32)?.into_unknown();
                let state = ctx.env.create_int32(ctx.value[2] as i32)?.into_unknown();
                Ok(vec![chat_id, kind, state])
            })?;

        let mut guard = self
            .connection_cb
            .lock()
            .map_err(|_| Error::from_reason("Mutex poisoned"))?;
        *guard = Some(tsfn);
        drop(guard);

        // Register callback exactly once with C library to avoid UAF on updates.
        if self.connection_cb_ptr.load(Ordering::Acquire).is_null() {
            let leaked = Arc::into_raw(Arc::clone(&self.connection_cb)) as *mut _;
            if self
                .connection_cb_ptr
                .compare_exchange(
                    std::ptr::null_mut(),
                    leaked,
                    Ordering::AcqRel,
                    Ordering::Acquire,
                )
                .is_ok()
            {
                unsafe {
                    ntg_on_connection_change(
                        self.handle,
                        raw_connection_callback,
                        leaked as *mut c_void,
                    );
                }
            } else {
                // Already registered by another thread, drop the extra leaked Arc.
                unsafe {
                    drop(Arc::from_raw(leaked));
                }
            }
        }

        Ok(())
    }

    // ── Public Async API ───────────────────────────────────────────────────────

    #[napi]
    pub async fn create(&self, chat_id: i64) -> Result<String> {
        let handle = self.handle;
        let pending = Arc::clone(&self.pending_ops);
        let (tx, rx) = oneshot::channel::<std::result::Result<Option<String>, String>>();

        let context = Box::into_raw(Box::new(AsyncContext {
            tx,
            error_code: 0,
            error_message: std::ptr::null_mut(),
            result_buffer: std::ptr::null_mut(),
            _keep_alive: None,
        }));

        let ntg_async = NtgAsyncStruct {
            user_data: context as *mut c_void,
            error_code: unsafe { std::ptr::addr_of_mut!((*context).error_code) },
            error_message: unsafe { std::ptr::addr_of_mut!((*context).error_message) },
            promise: Some(rust_async_callback),
        };

        let context_addr = context as usize;

        pending.fetch_add(1, Ordering::Relaxed);
        let result_blocking = tokio::task::spawn_blocking(move || unsafe {
            let ctx = context_addr as *mut AsyncContext;
            let rc = ntg_create(
                handle,
                chat_id,
                std::ptr::addr_of_mut!((*ctx).result_buffer),
                ntg_async,
            );
            pending.fetch_sub(1, Ordering::Release);
            if rc != 0 {
                // Reclaim memory immediately on synchronous failure
                let _ = Box::from_raw(ctx);
                return Err(Error::from_reason(format!(
                    "ntg_create returned error code {}",
                    rc
                )));
            }
            Ok(())
        })
        .await
        .map_err(|_| Error::from_reason("Tokio spawn_blocking failed"))?;
        result_blocking?;

        let result = rx
            .await
            .map_err(|_| Error::from_reason("Async operation cancelled"))?;

        match result {
            Ok(Some(offer)) => Ok(offer),
            Ok(None) => Err(Error::from_reason("ntg_create did not return an offer SDP")),
            Err(err) => Err(Error::from_reason(err)),
        }
    }

    #[napi]
    pub async fn connect(&self, chat_id: i64, params: String, is_presentation: bool) -> Result<()> {
        let handle = self.handle;
        let pending = Arc::clone(&self.pending_ops);
        let (tx, rx) = oneshot::channel::<std::result::Result<Option<String>, String>>();

        let c_params = CString::new(params)
            .map_err(|_| Error::from_reason("Invalid connection params string"))?;

        let context = Box::into_raw(Box::new(AsyncContext {
            tx,
            error_code: 0,
            error_message: std::ptr::null_mut(),
            result_buffer: std::ptr::null_mut(),
            // Store c_params in context to keep it alive on the heap until callback runs.
            _keep_alive: Some(Box::new(c_params)),
        }));

        let ntg_async = NtgAsyncStruct {
            user_data: context as *mut c_void,
            error_code: unsafe { std::ptr::addr_of_mut!((*context).error_code) },
            error_message: unsafe { std::ptr::addr_of_mut!((*context).error_message) },
            promise: Some(rust_async_callback),
        };

        let context_addr = context as usize;

        pending.fetch_add(1, Ordering::Relaxed);
        let result_blocking = tokio::task::spawn_blocking(move || unsafe {
            let ctx = context_addr as *mut AsyncContext;
            // Safely access c_params pointer from keep_alive which has stable address.
            let keeper = (*ctx)
                ._keep_alive
                .as_ref()
                .unwrap()
                .downcast_ref::<CString>()
                .unwrap();
            let rc = ntg_connect(handle, chat_id, keeper.as_ptr(), is_presentation, ntg_async);
            pending.fetch_sub(1, Ordering::Release);
            if rc != 0 {
                let _ = Box::from_raw(ctx);
                return Err(Error::from_reason(format!(
                    "ntg_connect returned error code {}",
                    rc
                )));
            }
            Ok(())
        })
        .await
        .map_err(|_| Error::from_reason("Tokio spawn_blocking failed"))?;
        result_blocking?;

        let result = rx
            .await
            .map_err(|_| Error::from_reason("Async operation cancelled"))?;

        match result {
            Ok(_) => Ok(()),
            Err(err) => Err(Error::from_reason(err)),
        }
    }

    #[napi(js_name = "set_audio_source")]
    pub async fn set_audio_source(&self, chat_id: i64, ffmpeg_cmd: String) -> Result<()> {
        let handle = self.handle;
        let pending = Arc::clone(&self.pending_ops);
        let (tx, rx) = oneshot::channel::<std::result::Result<Option<String>, String>>();

        let c_input = CString::new(ffmpeg_cmd)
            .map_err(|_| Error::from_reason("Invalid ffmpeg command string"))?;

        // Allocate audio_desc directly on the heap inside keep-alive state.
        let audio_desc = Box::new(NtgAudioDescriptionStruct {
            media_source: 2,         // SHELL
            input: c_input.as_ptr(), // stable because c_input is kept alive beside it
            sample_rate: 48000,
            channel_count: 1,
            keep_open: false,
        });

        let context = Box::into_raw(Box::new(AsyncContext {
            tx,
            error_code: 0,
            error_message: std::ptr::null_mut(),
            result_buffer: std::ptr::null_mut(),
            // Keep both CString and NtgAudioDescriptionStruct alive on the heap
            _keep_alive: Some(Box::new((c_input, audio_desc))),
        }));

        let ntg_async = NtgAsyncStruct {
            user_data: context as *mut c_void,
            error_code: unsafe { std::ptr::addr_of_mut!((*context).error_code) },
            error_message: unsafe { std::ptr::addr_of_mut!((*context).error_message) },
            promise: Some(rust_async_callback),
        };

        let context_addr = context as usize;

        pending.fetch_add(1, Ordering::Relaxed);
        let result_blocking = tokio::task::spawn_blocking(move || unsafe {
            let ctx = context_addr as *mut AsyncContext;

            let (ref _c_input, ref audio_desc) = *(*ctx)
                ._keep_alive
                .as_ref()
                .unwrap()
                .downcast_ref::<(CString, Box<NtgAudioDescriptionStruct>)>()
                .unwrap();

            let media_desc = NtgMediaDescriptionStruct {
                microphone: &**audio_desc as *const NtgAudioDescriptionStruct,
                speaker: std::ptr::null(),
                camera: std::ptr::null(),
                screen: std::ptr::null(),
            };

            let rc = ntg_set_stream_sources(handle, chat_id, 0, media_desc, ntg_async);
            pending.fetch_sub(1, Ordering::Release);
            if rc != 0 {
                let _ = Box::from_raw(ctx);
                return Err(Error::from_reason(format!(
                    "ntg_set_stream_sources returned error code {}",
                    rc
                )));
            }
            Ok(())
        })
        .await
        .map_err(|_| Error::from_reason("Tokio spawn_blocking failed"))?;
        result_blocking?;

        let result = rx
            .await
            .map_err(|_| Error::from_reason("Async operation cancelled"))?;

        match result {
            Ok(_) => Ok(()),
            Err(err) => Err(Error::from_reason(err)),
        }
    }

    #[napi]
    pub async fn pause(&self, chat_id: i64) -> Result<()> {
        self.run_simple_async_op(chat_id, |h, cid, a| unsafe { ntg_pause(h, cid, a) })
            .await
    }

    #[napi]
    pub async fn resume(&self, chat_id: i64) -> Result<()> {
        self.run_simple_async_op(chat_id, |h, cid, a| unsafe { ntg_resume(h, cid, a) })
            .await
    }

    #[napi]
    pub async fn mute(&self, chat_id: i64) -> Result<()> {
        self.run_simple_async_op(chat_id, |h, cid, a| unsafe { ntg_mute(h, cid, a) })
            .await
    }

    #[napi]
    pub async fn unmute(&self, chat_id: i64) -> Result<()> {
        self.run_simple_async_op(chat_id, |h, cid, a| unsafe { ntg_unmute(h, cid, a) })
            .await
    }

    #[napi]
    pub async fn stop(&self, chat_id: i64) -> Result<()> {
        self.run_simple_async_op(chat_id, |h, cid, a| unsafe { ntg_stop(h, cid, a) })
            .await
    }

    // ── Helper Async Executor ──────────────────────────────────────────────────

    async fn run_simple_async_op<F>(&self, chat_id: i64, op: F) -> Result<()>
    where
        F: FnOnce(usize, i64, NtgAsyncStruct) -> i32 + Send + 'static,
    {
        let handle = self.handle;
        let pending = Arc::clone(&self.pending_ops);
        let (tx, rx) = oneshot::channel::<std::result::Result<Option<String>, String>>();

        let context = Box::into_raw(Box::new(AsyncContext {
            tx,
            error_code: 0,
            error_message: std::ptr::null_mut(),
            result_buffer: std::ptr::null_mut(),
            _keep_alive: None,
        }));

        let ntg_async = NtgAsyncStruct {
            user_data: context as *mut c_void,
            error_code: unsafe { std::ptr::addr_of_mut!((*context).error_code) },
            error_message: unsafe { std::ptr::addr_of_mut!((*context).error_message) },
            promise: Some(rust_async_callback),
        };

        let context_addr = context as usize;

        pending.fetch_add(1, Ordering::Relaxed);
        let result_blocking = tokio::task::spawn_blocking(move || {
            let rc = op(handle, chat_id, ntg_async);
            pending.fetch_sub(1, Ordering::Release);
            if rc != 0 {
                unsafe {
                    let _ = Box::from_raw(context_addr as *mut AsyncContext);
                }
                return Err(Error::from_reason(format!(
                    "NTgCalls async operation returned error code {}",
                    rc
                )));
            }
            Ok(())
        })
        .await
        .map_err(|_| Error::from_reason("Tokio spawn_blocking failed"))?;
        result_blocking?;

        let result = rx
            .await
            .map_err(|_| Error::from_reason("Async operation cancelled"))?;

        match result {
            Ok(_) => Ok(()),
            Err(err) => {
                if err.contains("error code: 1") {
                    Ok(())
                } else {
                    Err(Error::from_reason(err))
                }
            }
        }
    }
}

impl Drop for NtgCalls {
    fn drop(&mut self) {
        // Wait for all in-flight spawn_blocking calls to exit the C library before destroying.
        while self.pending_ops.load(Ordering::Acquire) > 0 {
            std::hint::spin_loop();
        }
        unsafe {
            ntg_destroy(self.handle);
            // Reclaim the leaked Arc clones now that ntg_destroy guarantees no more callbacks.
            let p1 = self.stream_end_cb_ptr.load(Ordering::Acquire);
            if !p1.is_null() {
                drop(Arc::from_raw(p1 as *const _));
            }
            let p2 = self.connection_cb_ptr.load(Ordering::Acquire);
            if !p2.is_null() {
                drop(Arc::from_raw(p2 as *const _));
            }
        }
    }
}
