#!/usr/bin/env bash
# winget ve Homebrew dosyalarını yayınlanmış bir sürüm için üretir.
# Kullanım: packaging/update.sh 1.6.0
set -euo pipefail
V="${1:?version, e.g. 1.6.0}"
REL="https://github.com/hakancatana/catana-iptv/releases/download/v$V"
DIR="$(cd "$(dirname "$0")" && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

sha() { curl -fsSL "$1" -o "$TMP/f" && sha256sum "$TMP/f" | cut -d' ' -f1; }
EXE=$(sha "$REL/Catana-IPTV-Setup-$V.exe")
ARM=$(sha "$REL/Catana-IPTV-$V-mac-arm64.zip")
X64=$(sha "$REL/Catana-IPTV-$V-mac-x64.zip")

W="$DIR/winget/manifests/h/HakanCatana/CatanaIPTV/$V"
mkdir -p "$W"
cat > "$W/HakanCatana.CatanaIPTV.yaml" <<EOF
# yaml-language-server: \$schema=https://aka.ms/winget-manifest.version.1.9.0.schema.json
PackageIdentifier: HakanCatana.CatanaIPTV
PackageVersion: $V
DefaultLocale: en-US
ManifestType: version
ManifestVersion: 1.9.0
EOF
cat > "$W/HakanCatana.CatanaIPTV.installer.yaml" <<EOF
# yaml-language-server: \$schema=https://aka.ms/winget-manifest.installer.1.9.0.schema.json
PackageIdentifier: HakanCatana.CatanaIPTV
PackageVersion: $V
InstallerType: nullsoft
Scope: user
InstallModes:
  - interactive
  - silent
UpgradeBehavior: install
ReleaseDate: $(date -u +%Y-%m-%d)
Installers:
  - Architecture: x64
    InstallerUrl: $REL/Catana-IPTV-Setup-$V.exe
    InstallerSha256: ${EXE^^}
ManifestType: installer
ManifestVersion: 1.9.0
EOF
cat > "$W/HakanCatana.CatanaIPTV.locale.en-US.yaml" <<EOF
# yaml-language-server: \$schema=https://aka.ms/winget-manifest.defaultLocale.1.9.0.schema.json
PackageIdentifier: HakanCatana.CatanaIPTV
PackageVersion: $V
PackageLocale: en-US
Publisher: Mustafa Hakan Çatana
PublisherUrl: https://github.com/hakancatana
PublisherSupportUrl: https://github.com/hakancatana/catana-iptv/issues
PackageName: Catana IPTV
PackageUrl: https://github.com/hakancatana/catana-iptv
License: MIT
LicenseUrl: https://github.com/hakancatana/catana-iptv/blob/main/LICENSE
ShortDescription: Desktop IPTV player for Xtream Codes and M3U playlists.
Description: Live TV with rewind, TV guide, movies and series, multi-view, TV/remote mode and 9 languages. Catana IPTV is a player only and does not provide any content.
Moniker: catana-iptv
Tags:
  - iptv
  - xtream-codes
  - m3u
  - epg
  - tv
  - video-player
ReleaseNotesUrl: https://github.com/hakancatana/catana-iptv/releases/tag/v$V
ManifestType: defaultLocale
ManifestVersion: 1.9.0
EOF

cat > "$DIR/homebrew/catana-iptv.rb" <<EOF
cask "catana-iptv" do
  arch arm: "arm64", intel: "x64"

  version "$V"
  sha256 arm:   "$ARM",
         intel: "$X64"

  url "https://github.com/hakancatana/catana-iptv/releases/download/v#{version}/Catana-IPTV-#{version}-mac-#{arch}.zip"
  name "Catana IPTV"
  desc "Desktop IPTV player for Xtream Codes and M3U playlists"
  homepage "https://github.com/hakancatana/catana-iptv"

  livecheck do
    url :url
    strategy :github_latest
  end

  app "Catana IPTV.app"

  # Uygulama Apple tarafından onaylı (notarized) değil; karantina işaretini kaldır
  postflight do
    system_command "/usr/bin/xattr", args: ["-dr", "com.apple.quarantine", "#{appdir}/Catana IPTV.app"]
  end

  zap trash: [
    "~/Library/Application Support/Catana IPTV",
    "~/Library/Preferences/com.catana.iptv.plist",
  ]
end
EOF
echo "winget: $W"
echo "homebrew: $DIR/homebrew/catana-iptv.rb"
