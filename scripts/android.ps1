# Oyunu derleyip Android emülatörüne/telefona kurar ve açar.
# Kullanım:  npm run android                  (test derlemesi: satın almalar taklit, reklamlar test)
#            powershell -File scripts\android.ps1 -NoInstall
# Yayın derlemesi (imzalı AAB) ayrı yapılır: npm run release.
param([switch]$NoInstall)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$appId = "com.fmjapps.collector"

# Android Studio'nun kendi Java'sı (25) bu Gradle sürümüyle uyumsuz; JDK 21 kullanılır.
$jdk = Get-ChildItem "$env:USERPROFILE\.jdks" -Directory -Filter "jbr-21*" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $jdk) { throw "JDK 21 bulunamadı (~\.jdks\jbr-21*). Android Studio > Settings > Build Tools > Gradle > Gradle JDK ile indirebilirsin." }
$env:JAVA_HOME = $jdk.FullName
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$adb = "$env:ANDROID_HOME\platform-tools\adb.exe"

Push-Location $root
try {
  npm run build:test
  if ($LASTEXITCODE) { throw "Web derlemesi başarısız." }
  if (-not (Test-Path "android")) { npx cap add android } else { npx cap sync android }
  if ($LASTEXITCODE) { throw "Capacitor senkronizasyonu başarısız." }
  node scripts/android-post.cjs
  if ($LASTEXITCODE) { throw "Android son işlemleri başarısız." }
} finally { Pop-Location }

Push-Location "$root\android"
try {
  # --no-daemon: derleme kendi JVM'inde çalışıp biter; RAM'de süreç kalmaz ve başka projelerin derlemelerine dokunulmaz.
  & ".\gradlew.bat" assembleDebug --console=plain --no-daemon
  if ($LASTEXITCODE) { throw "Gradle derlemesi başarısız." }
} finally { Pop-Location }

$apk = "$root\android\app\build\outputs\apk\debug\app-debug.apk"
Write-Host "APK hazır: $apk"
if (-not $NoInstall) {
  & $adb install -r $apk
  & $adb shell monkey -p $appId -c android.intent.category.LAUNCHER 1 | Out-Null
  Write-Host "Kuruldu ve açıldı."
}
