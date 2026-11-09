# Publica los cambios en GitHub Pages.
# Uso (en la terminal de VS Code, dentro de esta carpeta):
#   powershell -ExecutionPolicy Bypass -File publicar.ps1 "Qué cambiaste"
#
# Además de subir los cambios, actualiza la versión de css y js en index.html
# para que los navegadores bajen los archivos nuevos y no usen los viejos guardados.
param([string]$mensaje = "Actualización de la web")

$v = Get-Date -Format "yyyyMMddHHmm"
$ruta = Join-Path $PSScriptRoot "index.html"
$html = [IO.File]::ReadAllText($ruta)
$html = $html -replace 'css/estilos\.css(\?v=\d+)?"', "css/estilos.css?v=$v`""
$html = $html -replace 'js/app\.js(\?v=\d+)?"', "js/app.js?v=$v`""
[IO.File]::WriteAllText($ruta, $html, (New-Object Text.UTF8Encoding $false))

git add -A
git commit -m $mensaje
git push
Write-Host ""
Write-Host "Listo. En 1 o 2 minutos se ve en https://brianmettica97-creator.github.io/novantiq-quintas/"
