# HEC app icon builder: single geometry source -> SVG + Android density PNGs + preview.
# Design: card 4B ligature (H/E shared stem, 45-deg flares bridging into C ring),
# colors from card 4: espresso brown bg #3d2c17, crema mark #f5c078.
# NOTE: PowerShell variables are case-insensitive; never pair $S with $s or $R with $r.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$dir = 'D:/vscode/HyperExController/review/hec-icon/final'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$bgHex = '#3d2c17'; $fgHex = '#f5c078'

# ---- master geometry (1024 space) ----
$y0 = 344; $y1 = 680; $yt1 = 408; $ym0 = 480; $ym1 = 544; $yb0 = 616
$hl0 = 172; $hl1 = 236
$st0 = 348; $st1 = 412
$midEnd = 500
$flareTop = 590; $flareBot = 534
$cx = 684; $cy = 512; $ro = 168; $ri = 104; $half = 47
$rad = [Math]::PI / 180
$minX = $hl0; $maxX = $cx + $ro * [Math]::Cos($half * $rad)
$minY = $y0; $maxY = $y1
$mcx = ($minX + $maxX) / 2; $mcy = ($minY + $maxY) / 2
$mw = $maxX - $minX

$polys = @(
  @(@($hl0,$y0), @($hl1,$y0), @($hl1,$y1), @($hl0,$y1)),
  @(@($st0,$y0), @($st1,$y0), @($st1,$y1), @($st0,$y1)),
  @(@(($hl1-2),$ym0), @(($st0+2),$ym0), @(($st0+2),$ym1), @(($hl1-2),$ym1)),
  @(@(($st1-2),$y0), @($flareTop,$y0), @($flareBot,$yt1), @(($st1-2),$yt1)),
  @(@(($st1-2),$ym0), @($midEnd,$ym0), @($midEnd,$ym1), @(($st1-2),$ym1)),
  @(@(($st1-2),$yb0), @($flareBot,$yb0), @($flareTop,$y1), @(($st1-2),$y1))
)

function New-MarkPath([single]$sc, [single]$ox, [single]$oy) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $p.FillMode = [System.Drawing.Drawing2D.FillMode]::Winding
  foreach ($poly in $polys) {
    [System.Drawing.PointF[]]$pts = @()
    foreach ($pt in $poly) { $pts += New-Object System.Drawing.PointF ([single]($pt[0]*$sc+$ox)), ([single]($pt[1]*$sc+$oy)) }
    $p.AddPolygon($pts)
  }
  $p.AddArc(([single](($cx-$ro)*$sc+$ox)), ([single](($cy-$ro)*$sc+$oy)), ([single](2*$ro*$sc)), ([single](2*$ro*$sc)), [single](-$half), [single](-266))
  $oex = $cx + $ro*[Math]::Cos($half*$rad);  $oey = $cy + $ro*[Math]::Sin($half*$rad)
  $iex = $cx + $ri*[Math]::Cos($half*$rad);  $iey = $cy + $ri*[Math]::Sin($half*$rad)
  $p.AddLine(([single]($oex*$sc+$ox)), ([single]($oey*$sc+$oy)), ([single]($iex*$sc+$ox)), ([single]($iey*$sc+$oy)))
  $p.AddArc(([single](($cx-$ri)*$sc+$ox)), ([single](($cy-$ri)*$sc+$oy)), ([single](2*$ri*$sc)), ([single](2*$ri*$sc)), [single]$half, [single]266)
  $p.CloseFigure()
  return $p
}

function Frame([int]$sz, [single]$frac) {
  $sc = [single]($sz * $frac / $mw)
  $ox = [single]($sz/2 - $mcx*$sc); $oy = [single]($sz/2 - $mcy*$sc)
  return @($sc, $ox, $oy)
}

function Render([int]$sz, [single]$frac, [string]$mode, [string]$out) {
  $bmp = New-Object System.Drawing.Bitmap $sz, $sz
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $bgBr = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($bgHex))
  if ($mode -eq 'square') { $g.Clear([System.Drawing.ColorTranslator]::FromHtml($bgHex)) }
  if ($mode -eq 'round') {
    $clip = New-Object System.Drawing.Drawing2D.GraphicsPath
    $clip.AddEllipse(0, 0, $sz, $sz); $g.SetClip($clip)
  }
  if ($mode -eq 'squircle') {
    $clip = New-Object System.Drawing.Drawing2D.GraphicsPath
    $rr = [single]($sz * 0.22)
    $clip.AddArc(0, 0, 2*$rr, 2*$rr, 180, 90); $clip.AddArc($sz-2*$rr, 0, 2*$rr, 2*$rr, 270, 90)
    $clip.AddArc($sz-2*$rr, $sz-2*$rr, 2*$rr, 2*$rr, 0, 90); $clip.AddArc(0, $sz-2*$rr, 2*$rr, 2*$rr, 90, 90)
    $clip.CloseFigure(); $g.SetClip($clip)
  }
  if ($mode -eq 'round' -or $mode -eq 'squircle') { $g.FillRectangle($bgBr, 0, 0, $sz, $sz) }
  $fr = Frame $sz $frac
  $path = New-MarkPath ($fr[0]) ($fr[1]) ($fr[2])
  $br = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($fgHex))
  $g.FillPath($br, $path)
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

function SvgPath([single]$sc, [single]$ox, [single]$oy) {
  $n = { param($v) [Math]::Round($v, 2).ToString([System.Globalization.CultureInfo]::InvariantCulture) }
  $d = ''
  foreach ($poly in $polys) {
    $d += 'M' + (& $n ($poly[0][0]*$sc+$ox)) + ' ' + (& $n ($poly[0][1]*$sc+$oy))
    for ($i=1; $i -lt $poly.Count; $i++) { $d += 'L' + (& $n ($poly[$i][0]*$sc+$ox)) + ' ' + (& $n ($poly[$i][1]*$sc+$oy)) }
    $d += 'Z'
  }
  $osx = $cx + $ro*[Math]::Cos(-$half*$rad); $osy = $cy + $ro*[Math]::Sin(-$half*$rad)
  $oex = $cx + $ro*[Math]::Cos($half*$rad);  $oey = $cy + $ro*[Math]::Sin($half*$rad)
  $isx = $cx + $ri*[Math]::Cos(-$half*$rad); $isy = $cy + $ri*[Math]::Sin(-$half*$rad)
  $iex = $cx + $ri*[Math]::Cos($half*$rad);  $iey = $cy + $ri*[Math]::Sin($half*$rad)
  $d += 'M' + (& $n ($osx*$sc+$ox)) + ' ' + (& $n ($osy*$sc+$oy))
  $d += 'A' + (& $n ($ro*$sc)) + ' ' + (& $n ($ro*$sc)) + ' 0 1 0 ' + (& $n ($oex*$sc+$ox)) + ' ' + (& $n ($oey*$sc+$oy))
  $d += 'L' + (& $n ($iex*$sc+$ox)) + ' ' + (& $n ($iey*$sc+$oy))
  $d += 'A' + (& $n ($ri*$sc)) + ' ' + (& $n ($ri*$sc)) + ' 0 1 1 ' + (& $n ($isx*$sc+$ox)) + ' ' + (& $n ($isy*$sc+$oy))
  $d += 'Z'
  return $d
}

$fr = Frame 1024 0.62
$d = SvgPath ($fr[0]) ($fr[1]) ($fr[2])
$svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="' + $bgHex + '"/><path fill="' + $fgHex + '" d="' + $d + '"/></svg>'
[System.IO.File]::WriteAllText((Join-Path $dir 'hec-icon.svg'), $svg)
$fr = Frame 432 0.60
$d = SvgPath ($fr[0]) ($fr[1]) ($fr[2])
$svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 432 432"><path fill="' + $fgHex + '" d="' + $d + '"/></svg>'
[System.IO.File]::WriteAllText((Join-Path $dir 'hec-icon-foreground.svg'), $svg)
$svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 432 432"><rect width="432" height="432" fill="' + $bgHex + '"/></svg>'
[System.IO.File]::WriteAllText((Join-Path $dir 'hec-icon-background.svg'), $svg)

foreach ($sz in @(48,72,96,144,192,512)) { Render $sz 0.62 'square' (Join-Path $dir ("legacy-$sz.png")) }
foreach ($sz in @(48,72,96,144,192)) { Render $sz 0.62 'round' (Join-Path $dir ("round-$sz.png")) }
foreach ($sz in @(108,162,216,324,432)) { Render $sz 0.60 'fg' (Join-Path $dir ("foreground-$sz.png")) }
foreach ($sz in @(108,162,216,324,432)) {
  $bmp = New-Object System.Drawing.Bitmap $sz, $sz
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.ColorTranslator]::FromHtml($bgHex))
  $bmp.Save((Join-Path $dir ("background-$sz.png")), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}
Render 512 0.62 'square' (Join-Path $dir 'preview-square.png')
Render 512 0.62 'round' (Join-Path $dir 'preview-round.png')
Render 512 0.60 'round' (Join-Path $dir 'preview-adaptive-circle.png')
Render 512 0.60 'squircle' (Join-Path $dir 'preview-adaptive-squircle.png')
'built'

