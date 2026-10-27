function Show-RoamMapPicker {
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    [Windows.Forms.Application]::EnableVisualStyles()
    $Maps = @(
        @{Id=10020; Name='雪山 · 标准场景'; Detail='已验证地图加载、人物落地和碰撞。推荐从这里开始。'},
        @{Id=10021; Name='雪山 · 夜间场景 [测试]'; Detail='已识别地图配置；当前版本尚未验证完整加载和出生点。'},
        @{Id=10019; Name='海岛 · 欧罗巴岛 [测试]'; Detail='本地场景 EU_KillZone_4096；可加载海岛资源，跑图兼容性仍在验证。'},
        @{Id=10024; Name='沙漠地图 [测试]'; Detail='已识别地图配置；当前版本尚未验证完整加载和出生点。'},
        @{Id=10016; Name='开发测试地图 [测试]'; Detail='内部测试地图，资源和出生点尚未验证，可能无法进入。'}
    )
    $Form = New-Object Windows.Forms.Form
    $Form.Text = '无限法则 · 本地跑图'
    $Form.ClientSize = New-Object Drawing.Size(560,360)
    $Form.StartPosition = 'CenterScreen'
    $Form.FormBorderStyle = 'FixedDialog'
    $Form.MaximizeBox = $false
    $Form.Font = New-Object Drawing.Font('Microsoft YaHei UI',10)
    $Title = New-Object Windows.Forms.Label
    $Title.Text = '选择地图'
    $Title.Font = New-Object Drawing.Font('Microsoft YaHei UI',20,[Drawing.FontStyle]::Bold)
    $Title.SetBounds(24,20,510,44)
    $List = New-Object Windows.Forms.ComboBox
    $List.DropDownStyle = 'DropDownList'
    $List.SetBounds(26,86,508,36)
    foreach ($Map in $Maps) { [void]$List.Items.Add($Map.Name) }
    $Detail = New-Object Windows.Forms.Label
    $Detail.SetBounds(26,140,508,65)
    $Notice = New-Object Windows.Forms.Label
    $Notice.SetBounds(26,212,508,55)
    $Notice.Text = '本地实验版：加载约需 2–3 分钟。WASD 移动，鼠标转向。每次会话一小时，退出游戏后可重新选择地图。'
    $Notice.ForeColor = [Drawing.Color]::DimGray
    $Start = New-Object Windows.Forms.Button
    $Start.Text = '进入地图'
    $Start.SetBounds(350,290,184,42)
    $Cancel = New-Object Windows.Forms.Button
    $Cancel.Text = '取消'
    $Cancel.SetBounds(226,290,108,42)
    $Cancel.DialogResult = [Windows.Forms.DialogResult]::Cancel
    $List.Add_SelectedIndexChanged({ $Detail.Text = $Maps[$List.SelectedIndex].Detail })
    $Start.Add_Click({ $Form.Tag=$Maps[$List.SelectedIndex].Id; $Form.DialogResult=[Windows.Forms.DialogResult]::OK; $Form.Close() })
    $List.SelectedIndex = 0
    $Form.Controls.AddRange(@($Title,$List,$Detail,$Notice,$Start,$Cancel))
    $Form.AcceptButton=$Start
    $Form.CancelButton=$Cancel
    $Result=$Form.ShowDialog()
    $Selected=$Form.Tag
    $Form.Dispose()
    if ($Result -eq [Windows.Forms.DialogResult]::OK) { return $Selected }
    return $null
}
