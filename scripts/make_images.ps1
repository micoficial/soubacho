param([string]$OutDir)
# OGP 画像（1200x630）とアイコン（180x180）を作る。作り直し: powershell -File scripts/make_images.ps1 -OutDir src/assets
Add-Type -AssemblyName System.Drawing

function New-Brush([string]$hex) { return New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($hex)) }
function RoundRect([System.Drawing.Graphics]$g, $brush, [float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90); $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90); $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure(); $g.FillPath($brush, $p); $p.Dispose()
}
function House([System.Drawing.Graphics]$g, [float]$x, [float]$y, [float]$s, $roof, $body) {
  # (x,y) は左上、s は幅
  $pts = @(
    (New-Object System.Drawing.PointF($x, ($y + $s * 0.45))),
    (New-Object System.Drawing.PointF(($x + $s / 2), $y)),
    (New-Object System.Drawing.PointF(($x + $s), ($y + $s * 0.45)))
  )
  $g.FillPolygon($roof, $pts)
  $g.FillRectangle($body, ($x + $s * 0.12), ($y + $s * 0.42), ($s * 0.76), ($s * 0.5))
}
$fontName = 'Yu Gothic UI'
$installed = (New-Object System.Drawing.Text.InstalledFontCollection).Families | ForEach-Object { $_.Name }
if (-not ($installed -contains $fontName)) { $fontName = 'Meiryo' }

# ---- OGP 1200x630 ----
$bmp = New-Object System.Drawing.Bitmap 1200, 630
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'; $g.TextRenderingHint = 'AntiAliasGridFit'; $g.InterpolationMode = 'HighQualityBicubic'
$g.Clear([System.Drawing.ColorTranslator]::FromHtml('#f6f5f1'))
$green = New-Brush '#24543f'; $green2 = New-Brush '#2f7a5b'; $ink = New-Brush '#1d2622'; $muted = New-Brush '#5c6862'; $white = New-Brush '#ffffff'; $line = New-Brush '#e1ded5'
$orange = New-Brush '#c26a2c'; $land = New-Brush '#8a6a2f'
$g.FillRectangle($green, 0, 0, 1200, 14)

$fTitle = New-Object System.Drawing.Font($fontName, 96, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$fSub = New-Object System.Drawing.Font($fontName, 38, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$fSmall = New-Object System.Drawing.Font($fontName, 28, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$fKey = New-Object System.Drawing.Font($fontName, 30, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$fLabel = New-Object System.Drawing.Font($fontName, 26, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)

$g.DrawString('まちの相場帳', $fTitle, $ink, 60, 92)
$g.DrawString('土地・マンション・戸建てが', $fSub, $muted, 66, 240)
$g.DrawString('実際にいくらで売れたか', $fSub, $muted, 66, 292)
RoundRect $g (New-Brush '#dcebe2') 66 378 470 56 28
$g.DrawString('無料・登録なし・国の公開データ', $fKey, $green, 90, 388)
$g.DrawString('micoficial.github.io/soubacho', $fSmall, $muted, 68, 540)

# 右側：家と、値段の推移の線
RoundRect $g $line 724 70 420 490 26
RoundRect $g $white 720 64 420 490 26
House $g 760 100 150 $green2 (New-Brush '#cfe3d7')
House $g 930 130 120 $land (New-Brush '#eadfc8')
$g.FillRectangle($line, 756, 262, 348, 3)
$pen = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#2f7a5b')), 7
$pen.LineJoin = 'Round'; $pen.StartCap = 'Round'; $pen.EndCap = 'Round'
$pts = @((New-Object System.Drawing.PointF(770, 480)), (New-Object System.Drawing.PointF(840, 462)), (New-Object System.Drawing.PointF(905, 470)), (New-Object System.Drawing.PointF(970, 430)), (New-Object System.Drawing.PointF(1030, 380)), (New-Object System.Drawing.PointF(1090, 330)))
$g.DrawLines($pen, $pts)
$pen2 = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#c26a2c')), 6
$pen2.DashStyle = 'Dash'
$pts2 = @((New-Object System.Drawing.PointF(940, 455)), (New-Object System.Drawing.PointF(1000, 418)), (New-Object System.Drawing.PointF(1060, 385)), (New-Object System.Drawing.PointF(1090, 365)))
$g.DrawLines($pen2, $pts2)
$g.FillEllipse($green2, 1080, 320, 20, 20)
$g.DrawString('坪単価・築年数別・推移', $fLabel, $ink, 762, 285)
$g.FillRectangle($line, 756, 510, 348, 2)
$bmp.Save((Join-Path $OutDir 'og.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()

# ---- アイコン 180x180 ----
$s = 180
$bmp = New-Object System.Drawing.Bitmap $s, $s
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.Clear([System.Drawing.ColorTranslator]::FromHtml('#24543f'))
$k = $s / 64
$roof = @((New-Object System.Drawing.PointF((12 * $k), (30 * $k))), (New-Object System.Drawing.PointF((32 * $k), (14 * $k))), (New-Object System.Drawing.PointF((52 * $k), (30 * $k))))
$g.FillPolygon($white, $roof)
$g.FillRectangle($white, (12 * $k), (29 * $k), (40 * $k), (21 * $k))
RoundRect $g $green2 (20 * $k) (36 * $k) (6 * $k) (10 * $k) (1.5 * $k)
RoundRect $g $orange (29 * $k) (31 * $k) (6 * $k) (15 * $k) (1.5 * $k)
RoundRect $g $land (38 * $k) (26 * $k) (6 * $k) (20 * $k) (1.5 * $k)
$bmp.Save((Join-Path $OutDir 'icon-180.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
"font=$fontName"
