Add-Type -AssemblyName System.Drawing

$srcPath = Join-Path $PSScriptRoot "..\public\Batik Seng-02.png"
$iconsDir = Join-Path $PSScriptRoot "..\public\icons"

if (-not (Test-Path $iconsDir)) {
    New-Item -ItemType Directory -Path $iconsDir -Force | Out-Null
}

$srcImg = [System.Drawing.Bitmap]::FromFile($srcPath)
Write-Output "Source image loaded: $($srcImg.Width)x$($srcImg.Height)"

function Resize-Image {
    param (
        [System.Drawing.Bitmap]$source,
        [int]$width,
        [int]$height,
        [string]$destPath,
        [bool]$isMaskable = $false
    )

    $destBitmap = New-Object System.Drawing.Bitmap($width, $height)
    $graphics = [System.Drawing.Graphics]::FromImage($destBitmap)

    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    if ($isMaskable) {
        $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(250, 248, 245))
        $graphics.FillRectangle($brush, 0, 0, $width, $height)
        $brush.Dispose()
        
        # 75% inner area for maskable safe zone
        $pad = [int]($width * 0.125)
        $drawW = $width - (2 * $pad)
        $drawH = $height - (2 * $pad)
        $destRect = New-Object System.Drawing.Rectangle($pad, $pad, $drawW, $drawH)
    } else {
        $destRect = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
    }

    $srcRect = New-Object System.Drawing.Rectangle(0, 0, $source.Width, $source.Height)
    $graphics.DrawImage($source, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

    $destBitmap.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $destBitmap.Dispose()
    Write-Output "Generated: $destPath"
}

# Standard sizes
$sizes = @(72, 96, 128, 144, 152, 192, 384, 512)
foreach ($s in $sizes) {
    $outPath = Join-Path $iconsDir "icon-$($s)x$($s).png"
    Resize-Image -source $srcImg -width $s -height $s -destPath $outPath -isMaskable $false
}

# Apple Touch Icon (180x180)
$applePath = Join-Path $iconsDir "apple-touch-icon.png"
Resize-Image -source $srcImg -width 180 -height 180 -destPath $applePath -isMaskable $false

$appleRootPath = Join-Path $PSScriptRoot "..\public\apple-touch-icon.png"
Copy-Item -Path $applePath -Destination $appleRootPath -Force

# Maskable Icons (192 and 512)
$maskable192 = Join-Path $iconsDir "icon-maskable-192x192.png"
Resize-Image -source $srcImg -width 192 -height 192 -destPath $maskable192 -isMaskable $true

$maskable512 = Join-Path $iconsDir "icon-maskable-512x512.png"
Resize-Image -source $srcImg -width 512 -height 512 -destPath $maskable512 -isMaskable $true

# Favicon PNGs
$fav32 = Join-Path $iconsDir "favicon-32x32.png"
Resize-Image -source $srcImg -width 32 -height 32 -destPath $fav32 -isMaskable $false

$fav16 = Join-Path $iconsDir "favicon-16x16.png"
Resize-Image -source $srcImg -width 16 -height 16 -destPath $fav16 -isMaskable $false

$srcImg.Dispose()
Write-Output "All icons generated successfully!"
