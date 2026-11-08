cask "catana-iptv" do
  arch arm: "arm64", intel: "x64"

  version "1.6.0"
  sha256 arm:   "b3da3cfcb3d71c0ba98248423a14a58353c25ddf30832a58ca0bf6224c3a3acc",
         intel: "74db0069605d347d4f97d5e8deb02c3bc14bb287a2bee25f1a7faf8d5d4f443b"

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
