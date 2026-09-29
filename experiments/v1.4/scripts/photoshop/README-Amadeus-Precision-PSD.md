# Amadeus 精细 PSD 面板

此脚本不会覆盖原来的 `build_amadeus_live2d_psd.jsx`。它是第二套独立脚本，用于把批准版 V4 制作成真正可编辑的“共享智能对象 + 图层蒙版 + 隐藏补画层”工作 PSD。

## 文件与输出

- 批准参考：`D:\Amadeus\design-reference\approved\Amadeus-classic-approved-v1.png`
- 精细工作 PSD：`D:\Amadeus\live2d-psd\Amadeus_precision_work_v1.psd`
- Cubism 导入 PSD：`D:\Amadeus\live2d-psd\Amadeus_import_v1.psd`

## 运行方法

1. 安装 Photoshop 并打开。
2. 选择“文件 → 脚本 → 浏览”。
3. 运行 `amadeus_precision_psd_panel.jsx`。
4. 点击 `Initialize / Open Work PSD`。
5. 在 `SOURCE_MASTER_V4` 上用对象选择、钢笔、套索或快速选择工具圈出一个部件。
6. 在面板中选择对应部件，点击 `Capture Active Selection as Masked Part`。
7. Photoshop 会复制共享智能对象并建立可编辑蒙版；用黑白画笔精修蒙版。
8. 对 V4 中不可见的区域，点击 `Create Empty Paint Layer for This Part` 后补画。
9. 点击 `Validate Parts` 检查缺少部件、空层与重名。
10. 完成后点击 `Export Cubism Import PSD`，脚本会复制工作文件、删除母版、栅格化智能对象、应用蒙版并清除空层。

## 为什么这比简单建层脚本更接近精细 PSD

- 所有可见部件都来自同一个 V4 像素母版，不会因为多次复制而产生色差。
- 每个部件保留独立图层蒙版，可以无损修边。
- 隐藏区域使用单独绘制层，不会破坏可见原图。
- 导出前会验证必需部件、空层和重复名称。
- 工作 PSD 与 Cubism 导入 PSD 分开，导出不会破坏可编辑母版。

## 仍需人工绘制的内容

刘海下完整脸底、完整眼球边缘、张嘴状态、衣服下面的身体、后脑发片等在 V4 中没有像素，必须在空绘制层中完成。脚本能保证文件结构和无损蒙版流程，但不会把不存在的像素伪装成原始数据。

