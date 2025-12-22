
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
2. 服装与配饰 (CLOTHING & ACCESSORIES)
3. 环境与场景 (ENVIRONMENT & SETTING)
4. 光影分析 (LIGHTING)
5. 镜头与技术规格 (CAMERA & TECHNICAL SPECS)
6. 色彩与情绪 (COLOR & MOOD)
7. 氛围与环境特效 (ATMOSPHERE)
8. 后期处理风格 (POST-PROCESSING)
9. 其余所有维度

输出格式要求：
请输出两个版本的提示词：
1. **English Version**: 针对 Midjourney v6, Stable Diffusion XL, DALL-E 3 优化的英文 Prompt。
2. **Chinese Version**: 对应的中文详细描述。

请严格按照以下格式输出：
## English Prompt
[在此处插入英文 Prompt]

## Chinese Prompt
[在此处插入中文 Prompt]
`;

export interface PresetTemplate {
  id: string;
  title: Record<Language, string>;
  description: Record<Language, string>;
  prompt: string;
  icon: string;
  color: string;
  type?: 'PORTRAIT' | 'PRODUCT';
}

export const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: 'christmas_portrait',
    title: { EN: "Christmas Portrait", CN: "圣诞写真", RU: "Рождественский портрет" },
    description: { EN: "Studio vibes with winter effects.", CN: "冬季圣诞主题。", RU: "Зимний портрет." },
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
    title: { EN: "Winter Sprite Collage", CN: "雪景中的精灵", RU: "Зимний эльф коллаж" },
    description: { EN: "Editorial winter poster style collage.", CN: "杂志风格多图拼贴。", RU: "Зимний постер коллаж." },
    prompt: `Editorial winter poster style multi-panel collage with spontaneous iPhone photography aesthetic...`,
    icon: "❄️",
    color: "from-blue-300 to-indigo-400",
    type: 'PORTRAIT'
  },
  {
    id: 'tech_exploded_view',
    title: { EN: "Tech Exploded View", CN: "超逼真爆炸视图", RU: "Технический разрез" },
    description: { EN: "Ultra-detailed product breakdown.", CN: "超细节产品拆解。", RU: "Технический разбор." },
    prompt: `Generate an ultra-detailed, hyperrealistic exploded technical view...`,
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
      presets: "AI Portrait",
      ref2img: "Ref Image Gen",
      test: "Test Module"
    },
    analyze: {
      title: "Decode The Visual Matrix",
      subtitle: "Reverse-engineer any image into a high-fidelity prompt.",
      uploadTitle: "Drop your image here",
      uploadSubtitle: "JPG, PNG, WEBP",
      dropToReplace: "DROP TO REPLACE",
      analyzing: "Analyzing topology...",
      changeImage: "Change Image",
      initSequence: "Init Sequence",
      retry: "Retry",
      generatedPrompt: "GENERATED PROMPT",
      modifySubject: "MODIFY SUBJECT",
      modifyPlaceholder: "Enter a new subject...",
      applyModification: "Apply Change",
      modifying: "Modifying Subject...",
      versionHistory: "VERSION HISTORY",
      original: "Original",
      version: "Version",
      importToTxt2Img: "Import to Text-to-Image",
      copywriting: "Copywriting",
    },
    txt2img: {
      title: "TEXT TO IMAGE",
      promptPlaceholder: "Describe your image...",
      generate: "Generate Images",
      generating: "Synthesizing...",
      productRef: "PRODUCT REF",
      charRef: "CHARACTER REF",
      addProduct: "ADD PRODUCT",
      addChar: "ADD CHAR",
      quantity: "QUANTITY",
      galleryTitle: "GENERATION GALLERY",
      delete: "Delete",
      clickToEnlarge: "Click to Enlarge"
    },
    img2img: {
      title: "IMAGE TO IMAGE",
      sourceImage: "SOURCE IMAGE",
      modPrompt: "MODIFICATION PROMPT",
      modPlaceholder: "Describe how you want to modify this image...",
      generate: "Generate Variations",
      processing: "Processing...",
      outputPreview: "OUTPUT PREVIEW AREA"
    },
    presets: {
      title: "AI PRESET STUDIO",
      selectStyle: "SELECT STYLE",
      uploadFace: "UPLOAD SELFIE",
      uploadProduct: "UPLOAD PRODUCT",
      generate: "Generate",
      processing: "Developing...",
      result: "RESULT"
    },
    ref2img: {
      title: "REFERENCE GEN",
      refLabel: "Reference Image",
      refHint: "Upload reference items",
      promptLabel: "Describe generation...",
      create: "CREATE",
      model: "Model",
      quality: "Quality",
      ratio: "Aspect Ratio",
      quantity: "Quantity",
      generating: "Generating...",
      emptyState: "Start creating your masterpiece!"
    },
    lightbox: {
      title: "Image Preview",
      close: "Close",
      next: "Next",
      prev: "Previous"
    }
  },
  CN: {
    nav: {
      reverse: "图像反推",
      txt2img: "文生图",
      img2img: "图生图",
      presets: "AI 写真",
      ref2img: "参考生图",
      test: "测试模块"
    },
    analyze: {
      title: "解码视觉矩阵",
      subtitle: "上传任何图像以反向解析其提示词 DNA。",
      uploadTitle: "拖拽图片到这里",
      uploadSubtitle: "支持 JPG, PNG, WEBP",
      dropToReplace: "拖拽以替换",
      analyzing: "正在分析拓扑结构...",
      changeImage: "更换图片",
      initSequence: "启动序列",
      retry: "重试",
      generatedPrompt: "生成的提示词",
      modifySubject: "修改画面主体",
      modifyPlaceholder: "输入新的主体...",
      applyModification: "应用修改",
      modifying: "正在替换主体...",
      versionHistory: "提示词版本历史",
      original: "原始反推",
      version: "修改版",
      importToTxt2Img: "导入到文生图",
      copywriting: "智能文案",
    },
    txt2img: {
      title: "文生图",
      promptPlaceholder: "详细描述您想要生成的图像...",
      generate: "生成图像",
      generating: "合成中...",
      productRef: "产品参考图",
      charRef: "角色参考图",
      addProduct: "添加产品",
      addChar: "添加角色",
      quantity: "数量",
      galleryTitle: "生成记录画廊",
      delete: "删除",
      clickToEnlarge: "点击放大"
    },
    img2img: {
      title: "图生图",
      sourceImage: "源图像",
      modPrompt: "修改提示词",
      modPlaceholder: "描述您想如何修改此图像...",
      generate: "生成变体",
      processing: "处理中...",
      outputPreview: "输出预览区域"
    },
    presets: {
      title: "AI 预设工作室",
      selectStyle: "选择风格模板",
      uploadFace: "上传面部照片",
      uploadProduct: "上传产品照片",
      generate: "生成大片",
      processing: "冲印中...",
      result: "生成结果"
    },
    ref2img: {
      title: "参考生图",
      refLabel: "参考图片",
      refHint: "上传参考主体",
      promptLabel: "描述生成内容...",
      create: "创作",
      model: "模型",
      quality: "清晰度",
      ratio: "宽高比",
      quantity: "数量",
      generating: "创作中...",
      emptyState: "开始创作您的第一个作品吧！"
    },
    lightbox: {
      title: "图片预览",
      close: "关闭",
      next: "下一张",
      prev: "上一张"
    }
  },
  RU: {
    nav: {
      reverse: "Обратный инжиниринг",
      txt2img: "Текст в изображение",
      img2img: "Изображение в изображение",
      presets: "AI Портрет",
      ref2img: "Генерация по ссылке",
      test: "Тестовый модуль"
    },
    analyze: {
      title: "Декодирование визуальной матрицы",
      subtitle: "Обратный инжиниринг изображения в высокоточный промпт.",
      uploadTitle: "Перетащите изображение сюда",
      uploadSubtitle: "JPG, PNG, WEBP",
      dropToReplace: "ОТПУСТИТЕ ДЛЯ ЗАМЕНЫ",
      analyzing: "Анализ топологии...",
      changeImage: "Изменить изображение",
      initSequence: "Запуск последовательности",
      retry: "Повторить",
      generatedPrompt: "СГЕНЕРИРОВАННЫЙ ПРОМПТ",
      modifySubject: "ИЗМЕНИТЬ ОБЪЕКТ",
      modifyPlaceholder: "Введите новый объект...",
      applyModification: "Применить изменения",
      modifying: "Изменение объекта...",
      versionHistory: "ИСТОРИЯ ВЕРСИЙ",
      original: "Оригинал",
      version: "Версия",
      importToTxt2Img: "Импорт в Текст-в-Изображение",
      copywriting: "Копирайтинг",
    },
    txt2img: {
      title: "ТЕКСТ В ИЗОБРАЖЕНИЕ",
      promptPlaceholder: "Опишите изображение...",
      generate: "Сгенерировать",
      generating: "Синтез...",
      productRef: "РЕФЕРЕНС ПРОДУКТА",
      charRef: "РЕФЕРЕНС ПЕРСОНАЖА",
      addProduct: "ДОБ. ПРОДУКТ",
      addChar: "ДОБ. ПЕРС.",
      quantity: "КОЛИЧЕСТВО",
      galleryTitle: "ГАЛЕРЕЯ ГЕНЕРАЦИЙ",
      delete: "Удалить",
      clickToEnlarge: "Нажмите для увеличения"
    },
    img2img: {
      title: "ИЗОБРАЖЕНИЕ В ИЗОБРАЖЕНИЕ",
      sourceImage: "ИСХОДНОЕ ИЗОБРАЖЕНИЕ",
      modPrompt: "ПРОМПТ МОДИФИКАЦИИ",
      modPlaceholder: "Опишите изменения...",
      generate: "Сгенерировать",
      processing: "Обработка...",
      outputPreview: "ПРЕДПРОСМОТР"
    },
    presets: {
      title: "AI СТУДИЯ",
      selectStyle: "ВЫБЕРИТЕ СТИЛЬ",
      uploadFace: "ЗАГРУЗИТЬ ЛИЦО",
      uploadProduct: "ЗАГРУЗИТЬ ПРОДУКТ",
      generate: "Создать",
      processing: "Обработка...",
      result: "РЕЗУЛЬТАТ"
    },
    ref2img: {
      title: "ГЕНЕРАЦИЯ ПО ССЫЛКЕ",
      refLabel: "Справочное изображение",
      refHint: "Загрузите объекты",
      promptLabel: "Опишите генерацию...",
      create: "СОЗДАТЬ",
      model: "Модель",
      quality: "Качество",
      ratio: "Соотношение сторон",
      quantity: "Количество",
      generating: "Генерация...",
      emptyState: "Начните создавать шедевр!"
    },
    lightbox: {
      title: "Просмотр изображения",
      close: "Закрыть",
      next: "След.",
      prev: "Пред."
    }
  }
};
