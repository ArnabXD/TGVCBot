fn main() {
  napi_build::setup();

  // Find libntgcalls in the local lib/ folder within the crate itself
  let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap();
  let lib_dir = std::path::Path::new(&manifest_dir).join("lib");

  println!("cargo:rustc-link-search=native={}", lib_dir.display());
  println!("cargo:rustc-link-lib=dylib=ntgcalls");

  // Set runtime search paths (rpath) relatively so the compiled .node file
  // automatically resolves libntgcalls in its own local lib/ directory
  #[cfg(target_os = "linux")]
  {
    println!("cargo:rustc-link-arg=-Wl,-rpath,$ORIGIN/lib");
    println!("cargo:rustc-link-arg=-Wl,-rpath,$ORIGIN");
  }
  #[cfg(target_os = "macos")]
  {
    println!("cargo:rustc-link-arg=-Wl,-rpath,@loader_path/lib");
    println!("cargo:rustc-link-arg=-Wl,-rpath,@loader_path");
  }
}
