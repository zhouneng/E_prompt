
import { Language } from './types';

export const APP_TITLE = "GEMINI REVERSE ENGINEER";
export const APP_SUBTITLE = "Forensic Image-to-Prompt Analysis System";

// The core instruction provided by the user
export const SYSTEM_INSTRUCTION = `
角色设定与核心目标：
你现在的唯一身份是顶级的“图像反推提示词工程师”（Image-to-Prompt Reverse Engineer）。你的目标不是生成图像，而是对用户上传的任何图像进行法医级别的深度解构，并将其转化为一个极度详细、包罗万象的文本到图像（Text-to-Image）生成提示词。

工作流程：
1. 接收用户上传的图像。
2. 绝对不要生成任何图像。
3. 根据下文的“极端颗粒度分析清单”，对图像进行强迫症式的细节拆解。
4. 将所有分析结果综合成连贯、可直接使用的提示词段落。

分析准则：极端颗粒度清单
你必须像一台精密的扫描仪，任何可见的元素都不能被忽略。在分析图像时，必须严格对照以下所有维度进行详尽描述：
1. 主体分析 (SUBJECT ANALYSIS)
人数与位置, 基本特征, 种族与肤色, 身高与体格, 姿态, 面部特征, 面部表情, 头发, 妆容, 胡须, 手部与动作, 肢体语言与能量.
2. 服装与配饰 (CLOTHING & ACCESSORIES - EXTREME DETAIL)
层次, 面料, 颜色, 图案, 版型, 造型细节, 状况, 光影交互, 褶皱, 工艺, 品牌, 配饰, 鞋履.
3. 环境与场景 (ENVIRONMENT & SETTING - COMPLETE BREAKDOWN)
地点, 建筑风格, 墙地, 所有可见物体, 家具, 装饰, 门窗, 天花板, 空间关系, 背景层次, 文字, 杂乱度, 温度指标.
4. 光影分析 (LIGHTING - EXHAUSTIVE ANALYSIS)
主光源, 辅助光/填充光, 阴影, 高光, 眼神光, 光线溢出 (Spill), 反射, 轮廓光/逆光, 光线衰减 (Fall-off), 特殊光效, 对比度, 材质交互.
5. 镜头与技术规格 (CAMERA & TECHNICAL SPECS)
焦段, 光影, 机位, 距离, 透视畸变, 动态模糊, 颗粒/噪点, 锐度, 镜头瑕疵, 画幅, 构图, 纵横比.
6. 色彩与情绪 (COLOR & MOOD - FORENSIC DETAIL)
色彩层级, 色彩和谐, 色温, 饱和度与对比度, 调色风格, 具体色板, 肤色准确性, 色彩心理与季节性.
7. 氛围与环境特效 (ATMOSPHERE & ENVIRONMENT EFFECTS)
空气质量, 可见颗粒, 天气与温度, 时代感, 氛围基调, 感官暗示, 环境叙事.
8. 后期处理风格 (POST-PROCESSING & EDITING STYLE)
调色细节, 明暗调整, 清晰度与质感, 锐化与降噪, 暗角与颗粒, 分离色调 (Split Toning), 白平衡, 修图痕迹, HDR/滤镜.
9. 文本/图形/品牌/文化/情感/技术 (其余所有维度)

输出格式要求：
请输出两个版本的提示词：
1. **English Version**: 针对 Midjourney v6, Stable Diffusion XL, DALL-E 3 优化的英文 Prompt。
2. **Chinese Version**: 对应的中文详细描述。

请严格按照以下格式输出（不要包含其他开场白）：

## English Prompt
[在此处插入英文 Prompt]

## Chinese Prompt
[在此处插入中文 Prompt]
`;

export interface PresetTemplate {
  id: string;
  title: Record<Language, string>;
  description: Record<Language, string>;
  prompt: string; // The raw prompt to send
  icon: string; // Emoji or SVG path
  color: string;
  type?: 'PORTRAIT' | 'PRODUCT'; // New field to distinguish mode
}

export const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: 'christmas_portrait',
    title: {
      EN: "Christmas Portrait",
      CN: "圣诞写真",
      RU: "Рождественский портрет"
    },
    description: {
      EN: "Professional studio photography with winter vibes, red knitwear, and snow effects.",
      CN: "专业影棚摄影，冬季圣诞主题，红色针织帽与雪花氛围。",
      RU: "Профессиональная студийная съемка с зимней атмосферой."
    },
    prompt: `Professional studio portrait, Christmas winter theme, pure white seamless background. Real skin texture (visible pores and natural sheen). Natural makeup: pale pink blush, natural lip color. 
    Studio setting: Pure white seamless background, professional soft lighting, gentle snowflakes falling on hair, knitted hat and scarf, winter atmosphere. 
    Clothing: Bright red cable knit hat, Bright red chunky wool scarf, Black wool coat.
    Technical specs: 85mm lens, f/1.8-2.8 wide aperture, shallow depth of field, natural soft studio lighting, photorealistic high-end fashion portrait quality, ultra-high detail, photography level resolution.
    Atmosphere: Natural, warm, gentle expression, quiet and contemplative gaze, looking directly at camera.`,
    icon: "🎄",
    color: "from-red-400 to-green-500",
    type: 'PORTRAIT'
  },
  {
    id: 'winter_sprite_collage',
    title: {
      EN: "Winter Sprite Collage",
      CN: "雪景中的精灵",
      RU: "Зимний эльф коллаж"
    },
    description: {
      EN: "Editorial winter poster style multi-panel collage with candid iPhone aesthetic.",
      CN: "杂志风格多图拼贴。iPhone 随拍美学，毛皮大衣、雪地靴与音乐播放器覆盖。",
      RU: "Многопанельный зимний постер в стиле iPhone фотографии."
    },
    prompt: `Editorial winter poster style multi-panel collage with spontaneous iPhone photography aesthetic (candid, warm, realistic). Soft snowflakes with delicate analog grain and slight handheld imperfections.

    Reference Adherence: Strictly follow the provided photo for facial reference with zero deviation. Preserve facial proportions, skin texture, expression, and identity features with 100% accuracy. Do not stylize or alter facial features.

    Consistent Elements:
    - Subject Wardrobe: Short faux fur coat, black leggings, classic UGG boots (minimalist, cozy, very wintry style)
    - Primary Device: iPhone 17 Pro Max in silver, held by the subject in relevant frames
    - Color Palette: Warm amber, soft red, pine green, soft winter gray

    Layout Configuration:
    Panel 1 (Top Left): Store window reflection photo at dusk. Faint Christmas lights, garlands, frosted glass edges, warm highlights on fur. Subject holding phone partially covering face. Grazing silhouettes, layered reflections, soft ghosting, natural glass curvature distortion.

    Panel 2 (Top Right): Ultra-wide street scene portrait (snowy sidewalk/Christmas market). Close-up, tilted downward camera angle. Subject casually leaning forward, hands in coat pockets. Black leggings and UGG boots clearly visible. Falling snow with slight motion blur. Subtle perspective distortion to enhance handheld authenticity.

    Panel 3 (Bottom Right): Intimate overhead selfie with warm street or cafe lighting. Holding a takeaway festive drink (coffee or mulled wine). Visible wired earphones. Clear detailed fur texture and winter fabrics. Soft grain enhancing nostalgic holiday atmosphere.

    Graphic Overlay: Minimalist Apple Music style mini player floating in the center of the collage, showing a popular Christmas song (e.g., 'Last Christmas' or 'All I Want for Christmas Is You'). Flat clean render without shadows.`,
    icon: "❄️",
    color: "from-blue-300 to-indigo-400",
    type: 'PORTRAIT'
  },
  {
    id: 'tech_exploded_view',
    title: {
      EN: "Tech Exploded View",
      CN: "超逼真爆炸视图",
      RU: "Технический разрез"
    },
    description: {
      EN: "Ultra-detailed technical breakdown of products preserving logos and details.",
      CN: "超细节的产品技术拆解视图，完美保留Logo与材质细节。",
      RU: "Ультра-детальный технический разбор продуктов."
    },
    prompt: `Generate an ultra-detailed, hyperrealistic exploded technical view of the subject provided in the reference image. 
    Break down the product into its internal components suspended in mid-air, showing complex mechanical and electronic structure. 
    Precise engineering layout, clean studio lighting, 8k resolution, cinematic rendering. 
    Ensure strict adherence to the original product's text, logos, materials, and form factor. 
    Keep the core identity of the product unchanged while revealing its inner workings.`,
    icon: "⚙️",
    color: "from-slate-600 to-slate-800",
    type: 'PRODUCT'
  }
];

export const TRANSLATIONS: Record<Language, any> = {
  EN: {
    nav: {
      reverse: "Reverse Engineer",
      txt2img: "Text to Image",
      img2img: "Image to Image",
      presets: "AI Portrait"
    },
    analyze: {
      title: "Decode The Visual Matrix",
      subtitle: "Upload any image to reverse-engineer its DNA. We analyze lighting, composition, texture, and mood to generate the ultimate prompt.",
      uploadTitle: "Drop your image here",
      uploadSubtitle: "Supports JPG, PNG, WEBP (Max 20MB)",
      dropToReplace: "DROP TO REPLACE",
      analyzing: "Analyzing Shared Prompt",
      changeImage: "Change Image",
      initSequence: "Init Sequence",
      retry: "Retry",
      generatedPrompt: "GENERATED_PROMPT",
      analyzingText: "ANALYZING_TOPOLOGY...",
      importToTxt2Img: "Import to Text-to-Image",
      sessionGallery: "SESSION GALLERY",
      restore: "RESTORE",
      copywriting: "Smart Copywriting",
      copywritingOn: "ON: Keep/Generate Text",
      copywritingOff: "OFF: Ignore Text"
    },
    txt2img: {
      title: "TEXT TO IMAGE",
      subtitle: "Transform your concepts into visual reality.",
      promptInput: "PROMPT INPUT",
      promptPlaceholder: "Describe the image you want to generate in detail...",
      productRef: "PRODUCT REFERENCE (CONSISTENCY)",
      charRef: "CHARACTER REFERENCE (CONSISTENCY)",
      charMode: "MODE",
      modeFace: "Face Only (Face Swap)",
      modeHead: "Head (Face + Hair)",
      modeFull: "Full Character (Body + Face)",
      optional: "OPTIONAL",
      addProduct: "ADD PRODUCT",
      addChar: "ADD CHAR",
      productIntegrity: "PRODUCT CONSISTENCY",
      charIntegrity: "CHARACTER CONSISTENCY",
      dimensions: "DIMENSIONS",
      presets: "PRESETS",
      custom: "CUSTOM",
      width: "WIDTH (PX)",
      height: "HEIGHT (PX)",
      closestRatio: "Closest Ratio",
      quantity: "QUANTITY",
      resolution: "QUALITY",
      generate: "Generate Images",
      generating: "Synthesizing...",
      clear: "CLEAR",
      clickToEnlarge: "CLICK TO ENLARGE",
      processing: "PROCESSING_REQUEST",
      galleryTitle: "GENERATION GALLERY",
      delete: "Delete",
      download: "Download"
    },
    img2img: {
      title: "IMAGE TO IMAGE",
      subtitle: "Modify, edit, or iterate on existing visuals.",
      sourceImage: "SOURCE IMAGE",
      modPrompt: "MODIFICATION PROMPT",
      modPlaceholder: "Describe how you want to modify this image (e.g., 'Change the background to a cyberpunk city', 'Add a neon sign')...",
      count: "COUNT",
      generate: "Generate Variations",
      processing: "Processing...",
      outputPreview: "OUTPUT PREVIEW AREA"
    },
    presets: {
      title: "AI PRESET STUDIO",
      subtitle: "Select a style, upload a reference, and get professional results instantly.",
      selectStyle: "SELECT STYLE",
      uploadFace: "UPLOAD SELFIE",
      uploadProduct: "UPLOAD PRODUCT",
      generate: "Generate",
      processing: "Developing...",
      result: "RESULT"
    },
    lightbox: {
      promptTitle: "PROMPT DETAILS",
      downloadImage: "Download Image",
      downloadWithMeta: "Download w/ Prompt",
      close: "Close"
    }
  },
  CN: {
    nav: {
      reverse: "图像反推",
      txt2img: "文生图",
      img2img: "图生图",
      presets: "AI 写真"
    },
    analyze: {
      title: "解码视觉矩阵",
      subtitle: "上传任何图像以反向解析其DNA。我们分析光线、构图、纹理和氛围，生成终极提示词。",
      uploadTitle: "拖拽图片到这里",
      uploadSubtitle: "支持 JPG, PNG, WEBP (最大 20MB)",
      dropToReplace: "拖拽以替换",
      analyzing: "正在分析分享的提示词",
      changeImage: "更换图片",
      initSequence: "启动序列",
      retry: "重试",
      generatedPrompt: "生成的提示词",
      analyzingText: "正在分析拓扑结构...",
      importToTxt2Img: "导入到文生图",
      sessionGallery: "会话画廊",
      restore: "恢复",
      copywriting: "智能文案",
      copywritingOn: "开启：保留/生成文案",
      copywritingOff: "关闭：忽略文案"
    },
    txt2img: {
      title: "文生图",
      subtitle: "将您的概念转化为视觉现实。",
      promptInput: "提示词输入",
      promptPlaceholder: "详细描述您想要生成的图像...",
      productRef: "产品参考图 (一致性)",
      charRef: "角色参考图 (一致性)",
      charMode: "模式",
      modeFace: "仅换脸 (Face Swap)",
      modeHead: "换头 (脸+发型)",
      modeFull: "完整人物 (参考全身)",
      optional: "可选",
      addProduct: "添加产品",
      addChar: "添加角色",
      productIntegrity: "产品一致性模式",
      charIntegrity: "角色一致性模式",
      dimensions: "尺寸",
      presets: "预设",
      custom: "自定义",
      width: "宽度 (PX)",
      height: "高度 (PX)",
      closestRatio: "最接近比例",
      quantity: "数量",
      resolution: "画质分辨率",
      generate: "生成图像",
      generating: "合成中...",
      clear: "清除",
      clickToEnlarge: "点击放大",
      processing: "正在处理请求",
      galleryTitle: "生成记录画廊",
      delete: "删除",
      download: "下载"
    },
    img2img: {
      title: "图生图",
      subtitle: "修改、编辑或迭代现有的视觉效果。",
      sourceImage: "源图像",
      modPrompt: "修改提示词",
      modPlaceholder: "描述您想如何修改此图像（例如：'将背景更改为赛博朋克城市'，'添加霓虹灯招牌'）...",
      count: "数量",
      generate: "生成变体",
      processing: "处理中...",
      outputPreview: "输出预览区域"
    },
    presets: {
      title: "AI 预设工作室",
      subtitle: "选择一个风格，上传参考图，一键生成专业大片。",
      selectStyle: "选择风格模板",
      uploadFace: "上传面部照片 (自拍)",
      uploadProduct: "上传产品照片",
      generate: "生成大片",
      processing: "冲印中...",
      result: "生成结果"
    },
    lightbox: {
      promptTitle: "提示词详情",
      downloadImage: "下载原图",
      downloadWithMeta: "下载 (含提示词)",
      close: "关闭"
    }
  },
  RU: {
    nav: {
      reverse: "Обратный инжиниринг",
      txt2img: "Текст в изображение",
      img2img: "Изображение в изображение",
      presets: "AI Портрет"
    },
    analyze: {
      title: "Декодировать визуальную матрицу",
      subtitle: "Загрузите любое изображение для обратного проектирования его ДНК.",
      uploadTitle: "Перетащите изображение сюда",
      uploadSubtitle: "Поддержка JPG, PNG, WEBP (Макс 20MB)",
      dropToReplace: "ПЕРЕТАЩИТЕ ДЛЯ ЗАМЕНЫ",
      analyzing: "Анализ общего промпта",
      changeImage: "Изменить изображение",
      initSequence: "Запуск последовательности",
      retry: "Повторить",
      generatedPrompt: "СГЕНЕРИРОВАННЫЙ ПРОМПТ",
      analyzingText: "АНАЛИЗ ТОПОЛОГИИ...",
      importToTxt2Img: "Импорт в Текст-в-Изображение",
      sessionGallery: "ГАЛЕРЕЯ СЕССИИ",
      restore: "ВОССТАНОВИТЬ",
      copywriting: "Умный Копирайтинг",
      copywritingOn: "ВКЛ: Сохр/Ген текст",
      copywritingOff: "ВЫКЛ: Игнор текста"
    },
    txt2img: {
      title: "ТЕКСТ В ИЗОБРАЖЕНИЕ",
      subtitle: "Превратите ваши концепции в визуальную реальность.",
      promptInput: "ВВОД ПРОМПТА",
      promptPlaceholder: "Подробно опишите изображение...",
      productRef: "РЕФЕРЕНС ПРОДУКТА",
      charRef: "РЕФЕРЕНС ПЕРСОНАЖА",
      charMode: "РЕЖИМ",
      modeFace: "Только Лицо",
      modeHead: "Голова",
      modeFull: "Полный персонаж",
      optional: "ОПЦИОНАЛЬНО",
      addProduct: "ДОБ. ПРОДУКТ",
      addChar: "ДОБ. ПЕРС.",
      productIntegrity: "ЦЕЛОСТНОСТЬ ПРОДУКТА",
      charIntegrity: "ЦЕЛОСТНОСТЬ ПЕРСОНАЖА",
      dimensions: "РАЗМЕРЫ",
      presets: "ПРЕСЕТЫ",
      custom: "ПОЛЬЗОВАТЕЛЬСКИЕ",
      width: "ШИРИНА (PX)",
      height: "ВЫСОТА (PX)",
      closestRatio: "Ближайшее соотн.",
      quantity: "КОЛИЧЕСТВО",
      resolution: "КАЧЕСТВО",
      generate: "Сгенерировать",
      generating: "Синтез...",
      clear: "ОЧИСТИТЬ",
      clickToEnlarge: "НАЖМИТЕ ДЛЯ УВЕЛИЧЕНИЯ",
      processing: "ОБРАБОТКА_ЗАПРОСА",
      galleryTitle: "ГАЛЕРЕЯ ГЕНЕРАЦИЙ",
      delete: "Удалить",
      download: "Скачать"
    },
    img2img: {
      title: "ИЗОБРАЖЕНИЕ В ИЗОБРАЖЕНИЕ",
      subtitle: "Изменяйте, редактируйте или повторяйте существующие визуальные эффекты.",
      sourceImage: "ИСХОДНОЕ ИЗОБРАЖЕНИЕ",
      modPrompt: "ПРОМПТ МОДИФИКАЦИИ",
      modPlaceholder: "Опишите, как вы хотите изменить это изображение...",
      count: "КОЛ-ВО",
      generate: "Сгенерировать",
      processing: "Обработка...",
      outputPreview: "ОБЛАСТЬ ПРЕДПРОСМОТРА"
    },
    presets: {
      title: "AI СТУДИЯ",
      subtitle: "Выберите стиль, загрузите фото и получите профессиональный результат.",
      selectStyle: "ВЫБЕРИТЕ СТИЛЬ",
      uploadFace: "ЗАГРУЗИТЬ ЛИЦО",
      uploadProduct: "ЗАГРУЗИТЬ ПРОДУКТ",
      generate: "Создать",
      processing: "Обработка...",
      result: "РЕЗУЛЬТАТ"
    },
    lightbox: {
      promptTitle: "ДЕТАЛИ ПРОМПТА",
      downloadImage: "Скачать",
      downloadWithMeta: "Скачать с метаданными",
      close: "Закрыть"
    }
  }
};
