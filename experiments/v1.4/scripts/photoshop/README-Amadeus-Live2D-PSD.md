# Amadeus Photoshop JSX

## 基准

- 批准造型：A 经典还原 V4
- 稳定参考路径：`D:\Amadeus\design-reference\approved\Amadeus-classic-approved-v1.png`
- 输出 PSD：`D:\Amadeus\live2d-psd\Amadeus_work_v1.psd`

## 使用方法

1. 安装并启动 Adobe Photoshop。
2. 选择“文件 → 脚本 → 浏览”。
3. 选择 `build_amadeus_live2d_psd.jsx`。
4. 脚本会创建并保存 4096×6144、RGB、8 bit/channel 的分层工作 PSD。
5. 展开最底部的 `10_GUIDE_DO_NOT_IMPORT` 可查看低透明度 V4 参考图。

## 脚本会完成

- 建立后发、后衣、身体、脸底、眼睛、嘴、前衣、手臂、前发和效果组。
- 分开左右眼、眉毛、耳朵、手臂、手、袖子和长发。
- 建立口腔、牙齿、舌头、上下唇和闭嘴线。
- 为必须补画的脸、眼白、后发、脖子和身体图层添加 `HiddenFill` 标记。
- 添加画布中心参考线并保存保留图层的 PSD。

## 脚本不会完成

- 不会从一张扁平 PNG 自动得到可信的精细拆件。
- 不会自动补画刘海下的脸、完整眼球、衣服下的身体或后脑发片。
- 不会直接生成可发布的 `.cmo3` 或 `.moc3`。

完成真实绘制后，应复制一份为 `Amadeus_import_v1.psd`，隐藏或删除 GUIDE，将每个部件内部的线稿、填色、蒙版和剪贴层合并为一个普通图层，再导入 Cubism。

