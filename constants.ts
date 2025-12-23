
import { Language } from './types';

export const APP_TITLE = "GEMINI REVERSE ENGINEER";
export const APP_SUBTITLE = "Forensic Image-to-Prompt Analysis System";

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
  type: 'PRODUCT' | 'PORTRAIT';
  icon: string;
  color: string;
  title: Record<Language, string>;
  description: Record<Language, string>;
  prompt: string;
}

// Fixed: Added missing PRESET_TEMPLATES export to resolve compilation error in PresetView.tsx
export const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: 'cyberpunk-portrait',
    type: 'PORTRAIT',
    icon: '🌃',
    color: 'from-blue-600 to-purple-600',
    title: { EN: 'Cyberpunk Neon', CN: '赛博霓虹', RU: 'Киберпанк' },
    description: { EN: 'High-tech low-life neon vibes', CN: '充满未来感的科技感与霓虹灯效', RU: 'Высокотехнологичный неоновый стиль' },
    prompt: 'A cyberpunk portrait, neon lighting, rainy city background, highly detailed, futuristic clothing, synthwave aesthetic, 8k resolution.'
  },
  {
    id: 'id-photo',
    type: 'PORTRAIT',
    icon: '👤',
    color: 'from-gray-400 to-gray-600',
    title: { EN: 'Professional ID', CN: '证件照', RU: 'Фото на паспорт' },
    description: { EN: 'Clean studio background portrait', CN: '干净的棚拍背景专业证件照', RU: 'Профессиональное студийное фото' },
    prompt: 'A professional studio ID photo, solid light blue background, centered portrait, soft lighting, professional attire, clear facial features.'
  },
  {
    id: 'minimal-product',
    type: 'PRODUCT',
    icon: '📦',
    color: 'from-amber-400 to-orange-500',
    title: { EN: 'Minimal Product', CN: '极简产品', RU: 'Минимализм продукта' },
    description: { EN: 'Clean minimalist product shot', CN: '极致简约的商业产品大片', RU: 'Чистый минималистичный снимок продукта' },
    prompt: 'A high-end product photography shot, minimalist aesthetic, soft studio lighting, neutral background, sharp focus, 8k resolution.'
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
      runninghub: "RH Workflow"
    },
    runninghub: {
      title: "RunningHub Automation",
      subtitle: "Execute complex ComfyUI workflows via API",
      workflowKey: "Workflow Key",
      workflowKeyPlaceholder: "Enter RH workflow key...",
      nodeConfig: "Node Parameters",
      nodeId: "Node ID",
      fieldName: "Field Name",
      fieldValue: "Value",
      addTask: "Add Parameter",
      run: "Run Workflow",
      running: "Processing Task...",
      history: "Task History",
      status: "Status",
      progress: "Progress",
      noTask: "No tasks yet. Configure and run your workflow.",
      apiKeyRequired: "RunningHub API Key is required in settings."
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
      title: "Text to Image",
      promptPlaceholder: "Describe what you want to see...",
      generate: "Generate Image",
      generating: "Generating...",
      quantity: "Quantity",
      productRef: "Product Reference",
      charRef: "Character Reference",
      galleryTitle: "Gallery",
      delete: "Delete"
    },
    presets: {
      title: "AI Portrait Presets",
      selectStyle: "Select Style",
      uploadFace: "Upload Face Photo",
      uploadProduct: "Upload Product Photo",
      generate: "Generate",
      processing: "Processing...",
      result: "Result"
    },
    ref2img: {
      title: "Reference Generation",
      refLabel: "Reference Image",
      refHint: "Click to upload reference",
      promptLabel: "Prompt",
      model: "Model",
      quality: "Quality",
      ratio: "Ratio",
      quantity: "Quantity",
      create: "Create",
      generating: "Generating...",
      emptyState: "Result will appear here"
    },
    lightbox: {
      generateWithPrompt: "Generate with this Prompt"
    },
    img2img: {
      sourceImage: "Source Image",
      modPrompt: "Modification Prompt",
      modPlaceholder: "Describe the changes...",
      generate: "Generate",
      processing: "Processing...",
      outputPreview: "Output Preview",
      dropToReplace: "Drop to Replace"
    }
  },
  CN: {
    nav: {
      reverse: "图像反推",
      txt2img: "文生图",
      img2img: "图生图",
      presets: "AI 写真",
      ref2img: "参考生图",
      runninghub: "RH 工作流"
    },
    runninghub: {
      title: "RunningHub 自动化",
      subtitle: "通过 API 调用复杂的 ComfyUI 工作流",
      workflowKey: "工作流 Key",
      workflowKeyPlaceholder: "输入 RunningHub 工作流唯一标识...",
      nodeConfig: "节点参数映射",
      nodeId: "节点 ID",
      fieldName: "字段名",
      fieldValue: "参数值",
      addTask: "添加映射",
      run: "发起任务",
      running: "任务处理中...",
      history: "任务历史记录",
      status: "状态",
      progress: "进度",
      noTask: "暂无任务。请配置工作流并运行。",
      apiKeyRequired: "请在设置中配置 RunningHub API Key。"
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
      promptPlaceholder: "描述你想看到的画面...",
      generate: "立即生成",
      generating: "正在生成中...",
      quantity: "生成数量",
      productRef: "产品参考图",
      charRef: "人物参考图",
      galleryTitle: "历史画廊",
      delete: "删除"
    },
    presets: {
      title: "AI 写真写真/模板",
      selectStyle: "选择风格模板",
      uploadFace: "上传面部照片",
      uploadProduct: "上传产品照片",
      generate: "开始制作",
      processing: "正在处理中...",
      result: "制作结果"
    },
    ref2img: {
      title: "参考图生成",
      refLabel: "参考图像",
      refHint: "点击上传参考图",
      promptLabel: "提示词",
      model: "模型",
      quality: "质量",
      ratio: "比例",
      quantity: "数量",
      create: "开始生成",
      generating: "生成中...",
      emptyState: "生成结果将在此显示"
    },
    lightbox: {
      generateWithPrompt: "使用此提示词生成"
    },
    img2img: {
      sourceImage: "原图",
      modPrompt: "修改指令",
      modPlaceholder: "描述你想要修改的内容...",
      generate: "生成修改",
      processing: "处理中...",
      outputPreview: "修改预览",
      dropToReplace: "拖拽以替换"
    }
  },
  RU: {
    nav: {
      reverse: "Обратный инжиниринг",
      txt2img: "Текст в изображение",
      img2img: "Изображение в изображение",
      presets: "AI Портрет",
      ref2img: "Генерация по ссылке",
      runninghub: "RH Воркфлоу"
    },
    runninghub: {
      title: "RunningHub Автоматизация",
      subtitle: "Запуск ComfyUI через API",
      workflowKey: "Ключ воркфлоу",
      workflowKeyPlaceholder: "Введите ключ RunningHub...",
      nodeConfig: "Параметры узла",
      nodeId: "ID узла",
      fieldName: "Имя поля",
      fieldValue: "Значение",
      addTask: "Добавить",
      run: "Запустить",
      running: "В процессе...",
      history: "История задач",
      status: "Статус",
      progress: "Прогресс",
      noTask: "Задач пока нет.",
      apiKeyRequired: "Требуется API ключ RunningHub."
    },
    txt2img: {
      title: "Текст в изображение",
      promptPlaceholder: "Опишите, что вы хотите увидеть...",
      generate: "Сгенерировать",
      generating: "Генерация...",
      quantity: "Количество",
      productRef: "Ссылка на продукт",
      charRef: "Ссылка на персонажа",
      galleryTitle: "Галерея",
      delete: "Удалить"
    },
    presets: {
      title: "AI Шаблоны",
      selectStyle: "Выберите стиль",
      uploadFace: "Загрузить лицо",
      uploadProduct: "Загрузить продукт",
      generate: "Создать",
      processing: "Обработка...",
      result: "Результат"
    },
    ref2img: {
      title: "Генерация по ссылке",
      refLabel: "Эталонное изображение",
      refHint: "Нажмите для загрузки",
      promptLabel: "Промпт",
      model: "Модель",
      quality: "Качество",
      ratio: "Соотношение",
      quantity: "Количество",
      create: "Создать",
      generating: "Генерация...",
      emptyState: "Результат появится здесь"
    },
    lightbox: {
      generateWithPrompt: "Сгенерировать с этим промптом"
    },
    img2img: {
      sourceImage: "Исходное изображение",
      modPrompt: "Промпт модификации",
      modPlaceholder: "Опишите изменения...",
      generate: "Создать",
      processing: "Обработка...",
      outputPreview: "Превью",
      dropToReplace: "Перетащите для замены"
    }
  }
};
