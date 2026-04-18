$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$src = Join-Path $root 'src\assets\fetchit-wordmark-raw.png'
$bmp = [System.Drawing.Bitmap]::FromFile($src)
try {
  $w = $bmp.Width
  $h = $bmp.Height
  $minX = $w
  $minY = $h
  $maxX = 0
  $maxY = 0
  for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
      $c = $bmp.GetPixel($x, $y)
      if ($c.A -lt 8) { continue }
      $lum = 0.299 * $c.R + 0.587 * $c.G + 0.114 * $c.B
      if ($lum -gt 18) {
        if ($x -lt $minX) { $minX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }
  $pad = 2
  $minX = [Math]::Max(0, $minX - $pad)
  $minY = [Math]::Max(0, $minY - $pad)
  $maxX = [Math]::Min($w - 1, $maxX + $pad)
  $maxY = [Math]::Min($h - 1, $maxY + $pad)
  $cw = $maxX - $minX + 1
  $ch = $maxY - $minY + 1
  $rect = New-Object System.Drawing.Rectangle @($minX, $minY, $cw, $ch)
  $crop = $bmp.Clone($rect, $bmp.PixelFormat)
  $outPath = Join-Path $root 'src\assets\fetchit-wordmark.png'
  $crop.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $crop.Dispose()
  Write-Host "cropped ${cw}x${ch} from ${w}x${h}"
}
finally {
  $bmp.Dispose()
}
