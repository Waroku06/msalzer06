{
  description = "msalzer06 / 扫雷分析器06";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in {
      packages = forAllSystems (system:
        let
          pkgs = import nixpkgs { inherit system; };
        in {
          default = pkgs.writeShellApplication {
            name = "msalzer06";
            runtimeInputs = [ pkgs.python3 ];
            text = ''
              port="''${PORT:-4173}"
              exec python3 -m http.server "$port" --directory ${self}
            '';
          };
        });

      apps = forAllSystems (system: {
        default = {
          type = "app";
          program = "${self.packages.${system}.default}/bin/msalzer06";
        };
      });
    };
}
