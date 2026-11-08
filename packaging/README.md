# Package managers

After a release is published, generate the manifests with the real checksums:

```bash
packaging/update.sh 1.6.0
```

## winget (Windows)

The manifests are written to `packaging/winget/manifests/…/<version>/`.
Submit them to [microsoft/winget-pkgs](https://github.com/microsoft/winget-pkgs):

1. Fork `microsoft/winget-pkgs`.
2. Copy `packaging/winget/manifests/h/HakanCatana/CatanaIPTV/<version>/` to the same path in your fork.
3. Open a pull request. After review the app installs with:

```powershell
winget install HakanCatana.CatanaIPTV
```

(Alternatively: `wingetcreate submit packaging/winget/manifests/h/HakanCatana/CatanaIPTV/<version>`.)

## Homebrew (macOS)

The cask lives in a separate tap repository, **hakancatana/homebrew-tap**:

1. Create the public repository `hakancatana/homebrew-tap`.
2. Copy `packaging/homebrew/catana-iptv.rb` to `Casks/catana-iptv.rb` in that repository.

Then:

```bash
brew install --cask hakancatana/tap/catana-iptv
```

The cask removes the quarantine flag after installing, so macOS does not block the unsigned app.
