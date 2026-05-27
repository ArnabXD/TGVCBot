fn main() {
  napi_build::setup();

  // Find libntgcalls in the lib/ folder at the root of the project
  let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap();
  let lib_dir = std::path::Path::new(&manifest_dir)
    .parent()
    .unwrap()
    .join("lib");

  println!("cargo:rustc-link-search=native={}", lib_dir.display());
  
  // Under Windows, it is called ntgcalls.dll
  // Under MacOS, libntgcalls.dylib
  // Under Linux, libntgcalls.so
  println!("cargo:rustc-link-lib=dylib=ntgcalls");

  // Set runtime search paths (rpath) so the compiled .node file can find libntgcalls
  #[cfg(target_os = "linux")]
  {
    println!("cargo:rustc-link-arg=-Wl,-rpath,$ORIGIN");
    println!("cargo:rustc-link-arg=-Wl,-rpath,$ORIGIN/../lib");
    println!("cargo:rustc-link-arg=-Wl,-rpath,$ORIGIN/lib");
  }
  #[cfg(target_os = "macos")]
  {
    println!("cargo:rustc-link-arg=-Wl,-rpath,@loader_path");
    println!("cargo:rustc-link-arg=-Wl,-rpath,@loader_path/../lib");
  }
}
