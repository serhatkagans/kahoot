@echo off
chcp 65001 >nul
title GencTek Kahoot - Sunucu
cd /d "%~dp0"
rem Kelimeden Hayale 3000'de, Terimler Sozlugu 3001'de calisir; ucu ayni anda acik kalabilsin diye bu proje 3002 kullanir.
set PORT=3002

where node >nul 2>nul
if errorlevel 1 (
  echo [HATA] Node.js bulunamadi. https://nodejs.org adresinden Node.js 22 veya ustunu kurun.
  pause
  exit /b 1
)

netstat -ano | findstr /r /c:":%PORT% .*LISTENING" >nul
if not errorlevel 1 (
  echo [HATA] %PORT% portu baska bir program tarafindan kullaniliyor.
  echo Kahoot zaten acik olabilir: http://localhost:%PORT%
  echo Degilse o programi kapatin ya da bu dosyadaki PORT degerini degistirin.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Paketler kuruluyor, bu ilk seferde birkac dakika surebilir...
  call npm install
  if errorlevel 1 goto hata
)

if not exist ".env.local" copy /y ".env.example" ".env.local" >nul

echo Uygulama derleniyor...
call npm run build
if errorlevel 1 goto hata

echo.
echo Sunucu baslatiliyor.
echo Ogrenciler (oyuna katil): http://localhost:%PORT%
echo Ogretmen (kahootlarim):   http://localhost:%PORT%/kahootlar
echo Ayni agdaki ogrenciler bu bilgisayarin IP adresiyle baglanir (ornegin http://192.168.1.20:%PORT%).
echo Kapatmak icin bu pencereyi kapatin ya da Ctrl+C basin.
echo.
start "" cmd /c "timeout /t 4 >nul & start http://localhost:%PORT%/kahootlar"
call npx next start -p %PORT%
goto son

:hata
echo.
echo [HATA] Islem basarisiz oldu. Yukaridaki mesajlari kontrol edin.
:son
pause
