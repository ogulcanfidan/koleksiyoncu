# Play Console'a yüklenecek imzalı AAB paketini üretir: release/the-collector-<sürüm>.aab
# Yayın derlemesi: satın almalar GERÇEK (Google Play Billing), test taklidi kapalı.
# Önce package.json'daki "version"ı artır (her yüklemede sürüm kodu büyümeli).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path "$root\release\keystore.properties")) { throw "release\keystore.properties yok: yükleme anahtarı olmadan imzalı paket üretilemez." }

$jdk = Get-ChildItem "$env:USERPROFILE\.jdks" -Directory -Filter "jbr-21*" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $jdk) { throw "JDK 21 bulunamadı (~\.jdks\jbr-21*)." }
$env:JAVA_HOME = $jdk.FullName
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"

Push-Location $root
try {
  npm run build
  if ($LASTEXITCODE) { throw "Web derlemesi başarısız." }
  if (-not (Test-Path "android")) { npx cap add android } else { npx cap sync android }
  if ($LASTEXITCODE) { throw "Capacitor senkronizasyonu başarısız." }
  node scripts/android-post.cjs
  if ($LASTEXITCODE) { throw "Android son işlemleri başarısız." }
} finally { Pop-Location }

Push-Location "$root\android"
try {
  & ".\gradlew.bat" bundleRelease --console=plain --no-daemon
  if ($LASTEXITCODE) { throw "Gradle derlemesi başarısız." }
} finally { Pop-Location }

$version = (Get-Content "$root\package.json" -Raw | ConvertFrom-Json).version
$aab = "$root\release\the-collector-$version.aab"
Copy-Item "$root\android\app\build\outputs\bundle\release\app-release.aab" $aab -Force
Write-Host "Yayın paketi hazır: $aab"
