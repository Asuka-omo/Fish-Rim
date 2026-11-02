param([ValidateSet('Check','Install','Uninstall','Restore')][string]$Action='Check')
$ErrorActionPreference='Stop'
$info=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'release.json') -Raw | ConvertFrom-Json
$pkg='fat-fish-deployment-protocol'
$archive=Join-Path $PSScriptRoot $info.package
function SameHash($file,$digest){(Test-Path -LiteralPath $file -PathType Leaf) -and ((Get-FileHash -LiteralPath $file).Hash -eq $digest)}
if($Action -in @('Install','Check') -and !(SameHash $archive $info.sha256)){throw 'Release file missing or checksum mismatch. Extract the entire ZIP first.'}
if($Action -eq 'Check'){Write-Output "Verified release $($info.version)";return}
$cli=Join-Path $env:LOCALAPPDATA 'Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd'
if(!(Test-Path -LiteralPath $cli)){throw 'The DSH Desktop CLI was not found in the default Windows install location.'}
$default=Join-Path $env:USERPROFILE '.dsh'
$dshRoot=if($env:DSH_HOME){[IO.Path]::GetFullPath($env:DSH_HOME)}else{$default}
if($dshRoot.TrimEnd('\') -eq $default -and (Get-Process -Name 'DeepSeek Harness' -ErrorAction SilentlyContinue)){throw 'Fully quit DeepSeek Harness using Application > Quit, then retry.'}
$profileDir=Join-Path $dshRoot 'profiles\desktop'
$profileFile=Join-Path $profileDir 'package.json'
if(!(Test-Path -LiteralPath $profileFile)){throw 'Open and quit DSH Desktop once to initialize the desktop profile.'}
$state=Join-Path $dshRoot 'fish-rim-installer'
$pin=Join-Path $state ("packages\"+$info.sha256+'\'+$info.package)
$history=Join-Path $state 'previous.json'
function Get-Dependency { (Get-Content -LiteralPath $profileFile -Raw | ConvertFrom-Json).dependencies.$pkg }
function Run-DSH($verb,$target){ & $cli plugin --profile desktop $verb $target; if($LASTEXITCODE -ne 0){throw "DSH plugin $verb failed."} }
function Verify-Files {
  foreach($row in $info.files.psobject.Properties){
    $path=Join-Path (Join-Path $profileDir ('node_modules\'+$pkg)) $row.Name
    if(!(SameHash $path $row.Value)){throw "Installed bytes differ: $($row.Name)"}
  }
}
$current=Get-Dependency
if($Action -eq 'Uninstall'){if($current){Run-DSH remove $pkg};return}
$previous=$null
if($current){
  if(!$current.StartsWith('file:')){throw "Existing installation is not a local archive. Use the DSH plugin manager to manage it."}
  $previous=[IO.Path]::GetFullPath([IO.Path]::Combine($profileDir,$current.Substring(5)))
  if(!(Test-Path -LiteralPath $previous -PathType Leaf)){throw 'Previous package is unavailable for rollback.'}
}
if($Action -eq 'Restore'){
  if(!(Test-Path -LiteralPath $history)){throw 'No prior install recorded by this installer.'}
  $prior=Get-Content -LiteralPath $history -Raw | ConvertFrom-Json
  if($previous -and $previous -ne $pin){throw 'The active package has changed since this install.'}
  $target=$prior.archive
  if($target -and !(SameHash $target $prior.sha256)){throw 'Saved rollback archive unavailable.'}
}else{
  if($previous -eq $pin){Verify-Files;Write-Output 'Already installed.';return}
  [IO.Directory]::CreateDirectory((Split-Path $pin))|Out-Null
  Copy-Item -LiteralPath $archive -Destination $pin -Force
  if(!(SameHash $pin $info.sha256)){throw 'Cached package checksum mismatch.'}
  $save=[ordered]@{archive=$null;sha256=$null}
  if($previous){
    $digest=(Get-FileHash -LiteralPath $previous).Hash
    $rollback=Join-Path $state ("rollback\"+$digest+'\'+[IO.Path]::GetFileName($previous))
    [IO.Directory]::CreateDirectory((Split-Path $rollback))|Out-Null
    if($previous -ne $rollback){Copy-Item -LiteralPath $previous -Destination $rollback -Force}
    if(!(SameHash $rollback $digest)){throw 'Backup checksum mismatch.'}
    $save.archive=$rollback;$save.sha256=$digest
  }
  $target=$pin
}
try{
  if($current){Run-DSH remove $pkg}
  if($target){Run-DSH add $target}
  if($Action -eq 'Install'){
    Verify-Files
    $save|ConvertTo-Json|Set-Content -LiteralPath ($history+'.new') -Encoding UTF8
    Move-Item -LiteralPath ($history+'.new') -Destination $history -Force
  }
}catch{
  $failure=$_
  $now=Get-Dependency
  if($now -ne $current){if($now){Run-DSH remove $pkg};if($previous){Run-DSH add $previous}}
  throw $failure
}
Write-Output "$Action complete. Start DeepSeek Harness Desktop."

