let
  tarball = fetchTarball { url = "https://github.com/NixOS/nixpkgs/archive/nixos-unstable.tar.gz"; };
  nixpkgs = import tarball {};
in with nixpkgs; mkShell {
  buildInputs = [
    bun
    deno
    nodejs_24
  ];

  shellHook = ''
    echo "Starting development environment..."
  '';
}
