# Paralel Claude Code oturumlarini canli izler.
# Kullanim:  .\tools\watch-sessions.ps1          (bu proje, canli)
#            .\tools\watch-sessions.ps1 -All      (tum projeler)
#            .\tools\watch-sessions.ps1 -Once     (tek sefer)
param([switch]$All, [switch]$Once, [double]$Interval = 2.0)
$py = Join-Path $PSScriptRoot "session_monitor.py"
$args = @()
if ($All)  { $args += "--all" }
if ($Once) { $args += "--once" }
$args += @("--interval", $Interval)
python $py @args
