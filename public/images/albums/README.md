# 相册功能使用说明

Mizuki 主题的相册功能支持两种方式：本地图片模式会自动扫描相册目录中的图片；显式图片清单模式会从 `info.json` 中读取每张图片的 `src`，既可以引用远程 URL，也可以引用站内 `/images/...` 路径。

## 快速开始

创建本地图片相册只需 3 步：

1. 在 `public/images/albums/` （本说明文件所在目录）下创建一个文件夹（文件夹名即为相册 ID）
2. 在文件夹中放置 `cover.webp` 或 `cover.jpg`（封面图）和其他照片
3. 创建 `info.json` 配置文件

完成后，相册会自动出现在相册列表页面。若只是把项目里已有图片整理为相册，优先使用显式图片清单模式引用原路径，避免重复存储同一张图片。

## 目录结构

```
public/images/albums/
├── my-travel-2024/              # 相册文件夹（文件夹名 = 相册ID）
│   ├── info.json                # 相册配置文件（必需）
│   ├── cover.webp               # 封面图（必需，也可使用 cover.jpg）
│   ├── photo1.jpg               # 相册照片
│   ├── photo2.jpg
│   └── photo3.jpg
├── daily-life/                  # 另一个本地相册
│   ├── info.json
│   ├── cover.jpg
│   └── ...
├── project-devices/             # 显式图片清单相册
│   └── info.json                # 在 photos 中引用站内 /images/... 路径
└── README.md                    # 本说明文件
```

## 配置文件说明

### 本地图片模式

在相册文件夹中创建 `info.json`：

```json
{
  "title": "我的旅行相册",
  "description": "2024年夏天的美好回忆",
  "date": "2024-08-01",
  "location": "日本东京",
  "tags": ["旅行", "风景", "夏天"],
  "layout": "masonry",
  "columns": 3,
  "hidden": false
}
```

**配置项说明：**

| 字段 | 必需 | 说明 | 默认值 |
|------|------|------|--------|
| `title` | 是 | 相册标题 | 使用文件夹名 |
| `description` | 否 | 相册描述 | 空 |
| `date` | 否 | 相册日期（格式：YYYY-MM-DD） | 当前日期 |
| `location` | 否 | 拍摄地点 | 空 |
| `tags` | 否 | 标签数组 | `[]` |
| `layout` | 否 | 布局方式：`grid`（网格）或 `masonry`（瀑布流） | `grid` |
| `columns` | 否 | 列数（2-4） | `3` |
| `hidden` | 否 | 是否隐藏相册 | `false` |

### 显式图片清单模式

如果想使用外部图片链接（例如图床）或引用站内已有 public 图片，设置 `mode: "external"`：

```json
{
  "mode": "external",
  "title": "项目设备图集",
  "description": "使用站内图片路径的项目相册",
  "date": "2024-08-28",
  "location": "项目资源库",
  "tags": ["项目资源", "设备"],
  "layout": "masonry",
  "columns": 3,
  "cover": "/images/device/oneplus13t.png",
  "photos": [
    {
      "id": "oneplus13t",
      "src": "/images/device/oneplus13t.png",
      "alt": "OnePlus 13T 设备图片",
      "title": "OnePlus 13T",
      "tags": ["设备", "手机"]
    }
  ]
}
```

**显式图片清单模式额外字段：**

| 字段 | 必需 | 说明 |
|------|------|------|
| `mode` | 是 | 设置为 `"external"` 启用显式图片清单模式 |
| `cover` | 是 | 封面图片路径，可使用远程 URL 或站内 `/images/...` 路径 |
| `photos` | 是 | 照片数组，每张照片包含 `src`、`alt`、`title` 等字段，详见下表 |

**photos 数组中每张图片的字段说明（仅显式图片清单模式需要）：**

| 字段 | 必需 | 说明 | 示例 |
|------|------|------|------|
| `id` | 否 | 照片唯一标识符 | `"photo-1"` |
| `src` | 是 | 照片路径，可使用远程 URL 或站内 `/images/...` 路径 | `"/images/device/oneplus13t.png"` |
| `thumbnail` | 否 | 缩略图路径（不提供则使用原图） | `"https://example.com/thumb.jpg"` |
| `alt` | 否 | 图片替代文本（用于无障碍访问） | `"美丽的日落"` |
| `title` | 否 | 照片标题 | `"海边日落"` |
| `description` | 否 | 照片详细描述 | `"2024年夏天在海边拍摄的日落"` |
| `tags` | 否 | 照片标签数组 | `["日落", "海边"]` |
| `date` | 否 | 拍摄日期（格式：YYYY-MM-DD） | `"2024-08-01"` |
| `location` | 否 | 拍摄地点 | `"冲绳海滩"` |
| `width` | 否 | 照片宽度（像素） | `1920` |
| `height` | 否 | 照片高度（像素） | `1280` |
| `camera` | 否 | 相机型号 | `"Canon EOS R5"` |
| `lens` | 否 | 镜头型号 | `"RF 24-70mm F2.8"` |
| `settings` | 否 | 拍摄参数（字符串） | `"f/2.8, 1/500s, ISO 100"` |

> **注意**：
> - 本地图片模式**不需要**配置 `photos` 字段，系统会自动扫描文件夹中的所有图片文件
> - 显式图片清单模式**必须**手动配置 `photos` 数组，至少需要提供 `src` 字段
> - 项目相册应优先引用站内已有 public 路径，不重复复制图片文件
> - 使用远程图片时，建议提供 `thumbnail` 缩略图以提升加载速度

## 图片格式建议

### 封面图片 (`cover.webp` 或 `cover.jpg`)
- **尺寸**：800×600px（4:3 比例）
- **格式**：优先使用 WebP，兼容 JPG（显式图片清单模式可支持更多格式）
- **大小**：建议 < 200KB

### 相册照片
- **格式**：JPG、JPEG、PNG、WebP、GIF、SVG、AVIF
- **尺寸**：建议最大宽度 1920px
- **优化**：建议压缩后上传，提升加载速度

## 布局选项

### 网格布局 (Grid)

```json
{
  "layout": "grid",
  "columns": 3
}
```

- 适合尺寸统一的照片
- 支持 2-4 列
- 照片会被裁剪为正方形

### 瀑布流布局 (Masonry)

```json
{
  "layout": "masonry",
  "columns": 3
}
```

- 适合不同尺寸的照片
- 保持照片原始比例
- 自动排列，视觉效果更自然

## 示例相册

项目包含以下示例相册供参考：

### ProjectDevices
- **显式图片清单模式**项目相册
- 引用设备页面使用的公开图片
- 默认隐藏，不出现在公开相册列表
- 网格布局，3 列

### ProjectDiary
- **显式图片清单模式**项目相册
- 引用日记页面使用的公开图片
- 默认隐藏，不出现在公开相册列表
- 瀑布流布局，3 列

### ProjectMarkdownGallery
- **显式图片清单模式**项目相册
- 引用 Markdown 图片网格文章使用的代表性演示图
- 公开展示
- 瀑布流布局，3 列

### AcgExample
- **本地图片模式**示例
- 展示如何使用本地图片创建相册
- 瀑布流布局，3 列

### ExternalExample
- **显式图片清单模式**示例（默认隐藏）
- 展示如何使用外部图片链接
- 适合使用图床的场景

### HiddenExample
- **隐藏相册**示例
- 展示如何创建不在列表显示的相册
- 可通过直接访问 URL 查看

## 高级功能

### 文件名标签（实验性）

系统支持从文件名解析标签（格式：`基本名_标签1_标签2.ext`）：

```
photo_sunset_beach.jpg  →  标签：sunset, beach
```

### 隐藏相册

设置 `"hidden": true` 可以隐藏相册，但仍可通过 URL 直接访问：

```
访问：/albums/your-album-id/
```

## 常见问题

**Q: 为什么我的相册没有显示？**  
A: 本地图片模式检查是否存在 `info.json` 和 `cover.webp` 或 `cover.jpg`；显式图片清单模式检查 `cover` 和 `photos[].src` 是否存在；同时确认 `hidden` 没有设置为 `true`。

**Q: 可以使用其他图片格式吗？**  
A: 可以，支持 JPG、PNG、WebP、GIF、SVG、AVIF 等格式。

**Q: 如何优化图片加载速度？**  
A: 建议使用 WebP 等压缩率较高的格式压缩图片大小。使用外链模式时设置缩略图。

**Q: 如何更改相册排序？**  
A: 相册按时间顺序展示，可通过修改相册的 `date` 字段调整排序。
