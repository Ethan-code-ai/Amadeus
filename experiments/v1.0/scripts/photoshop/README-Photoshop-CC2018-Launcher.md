# Amadeus 精细 PSD：Photoshop CC 2018 启动说明

已确认的 Photoshop 环境：Adobe Photoshop CC 2018，版本 19.1.9。

CC 2018 通过 COM 直接载入较大的持久 ScriptUI 面板时，可能误报“JavaScript 代码丢失”。兼容启动器会先读取主面板脚本，再在一个小型持久引擎中加载它；主面板脚本本身保持不变。

## 文件

- 主面板：`D:\Amadeus\scripts\photoshop\amadeus_precision_psd_panel.jsx`
- CC 2018 启动器：`D:\Amadeus\scripts\photoshop\launch_amadeus_precision_psd_cc2018.jsx`
- 工作 PSD：`D:\Amadeus\live2d-psd\Amadeus_precision_work_v1.psd`
- Cubism 导入 PSD：`D:\Amadeus\live2d-psd\Amadeus_import_v1.psd`

## 使用

1. 在 Photoshop 中选择“文件 → 脚本”。
2. 若菜单里已有 `Amadeus Precision PSD CC2018`，直接选择它。
3. 若菜单里没有，选择“浏览”，打开 `launch_amadeus_precision_psd_cc2018.jsx`。
4. 第一次运行会自动建立工作 PSD；以后运行会直接打开精细拆件面板。
5. 在 V4 母版上框选部件，在面板中选中相应名称，然后执行 `Capture Active Selection as Masked Part`。
6. 隐藏区域使用 `Create Empty Paint Layer for This Part` 补画。
7. 完成后先运行 `Validate Parts`，再运行 `Export Cubism Import PSD`。

工作 PSD 保留智能对象和可编辑蒙版；导入 PSD 会栅格化副本，不会破坏工作母版。
