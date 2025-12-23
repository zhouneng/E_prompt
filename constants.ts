
import { Language } from './types';

export const APP_TITLE = "GEMINI REVERSE ENGINEER";
export const APP_SUBTITLE = "Forensic Image-to-Prompt Analysis System";

export const SYSTEM_INSTRUCTION = `
角色设定与核心目标：
你现在的唯一身份是顶级的“图像反推提示词工程师”（Image-to-Prompt Reverse Engineer）。你的目标不是生成图像，而是对用户上传的任何图像进行法医级别的深度解构，并将其转化为一个极度详细、包罗万象的文本到图像（Text-to-Image）生成提示词。

工作流程：
1. 接收用户上传 of 图像。
2. 绝对不要生成任何图像。
3. 根据下文的“极端颗粒度分析清单”，对图像进行强迫症式的细节拆解。
4. 将所有分析结果综合成连贯、可直接使用的提示词段落。

分析准则：极端颗粒度清单
你必须像一台精密的扫描仪，任何可见的元素都不能 be 忽略。在分析图像时，必须严格对照以下所有维度进行详尽描述：
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
    description: { EN: 'Clean studio background portrait', CN: '干净的棚拍背景专业证件照', RU: 'Профессиональное студийное foto' },
    prompt: 'A professional studio ID photo, solid light blue background, centered portrait, soft lighting, professional attire, clear facial features.'
  }
];

export const TRANSLATIONS: Record<Language, any> = {
  EN: {
    nav: {
      reverse: "Reverse",
      txt2img: "Text2Img",
      img2img: "Img2Img",
      presets: "Portrait",
      ref2img: "RefGen",
      runninghub: "Workflow"
    },
    runninghub: {
      title: "RUNNINGHUB",
      panel: "CONFIG PANEL",
      importJson: "Import API JSON",
      clearAll: "Clear All",
      workflowId: "Target Workflow ID",
      presetLabel: "Workflow Preset",
      saveAsPreset: "Save as Preset",
      execute: "Launch Remote Deployment",
      deploying: "Deploying...",
      control: "Mission Control",
      noTasks: "Awaiting tasks",
      deleteNode: "Delete Node",
      deleteField: "Delete Field",
      confirmClear: "Clear all settings?",
      selectNodesTitle: "Select Nodes",
      importSelected: "Import Selected",
      cancel: "Cancel",
      selectAll: "Select All",
      deselectAll: "Deselect All",
      presetManager: "Workflow Presets",
      savePreset: "Save New Preset",
      presetName: "Preset Name",
      deletePreset: "Delete Preset",
      placeholderPreset: "Select a preset...",
      modified: "MODIFIED",
      renamePlaceholder: "Double-click to rename"
    },
    analyze: {
      title: "Decode Matrix",
      subtitle: "Image to Prompt Reverse Engineering",
      uploadTitle: "Drop Image",
      uploadSubtitle: "JPG, PNG, WEBP",
      dropToReplace: "DROP TO REPLACE",
      analyzing: "Analyzing...",
      changeImage: "Change",
      initSequence: "Initialize",
      retry: "Retry",
      generatedPrompt: "GENERATED PROMPT",
      modifySubject: "MODIFY SUBJECT",
      modifyPlaceholder: "New subject...",
      applyModification: "Apply",
      modifying: "Modifying...",
      versionHistory: "HISTORY",
      original: "Original",
      version: "Version",
      importToTxt2Img: "Transfer",
      copywriting: "Copywriter",
    },
    txt2img: {
      title: "Text to Image",
      promptPlaceholder: "Prompt...",
      generate: "Generate",
      generating: "Generating...",
      quantity: "Count",
      productRef: "Product Ref",
      charRef: "Char Ref",
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
      title: "RUNNINGHUB",
      panel: "CONFIG PANEL",
      importJson: "导入 API JSON",
      clearAll: "清空配置",
      workflowId: "目标工作流 ID",
      presetLabel: "工作流预设",
      saveAsPreset: "保存为新预设",
      execute: "启动远程部署",
      deploying: "正在部署...",
      control: "任务监控中心",
      noTasks: "等待任务启动",
      deleteNode: "删除节点",
      deleteField: "删除字段",
      confirmClear: "确定要重置当前工作流吗？",
      selectNodesTitle: "挑选要导入的节点",
      importSelected: "导入所选节点",
      cancel: "取消",
      selectAll: "全选",
      deselectAll: "反选",
      presetManager: "工作流预设",
      savePreset: "保存为新预设",
      presetName: "预设名称",
      deletePreset: "删除预设",
      placeholderPreset: "选择一个工作流预设...",
      modified: "MODIFIED",
      renamePlaceholder: "点击可重命名标题"
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
      reverse: "Реверс",
      txt2img: "Текст в фото",
      img2img: "Фото в фото",
      presets: "Портрет",
      ref2img: "RefGen",
      runninghub: "Процесс"
    },
    runninghub: {
      title: "RUNNINGHUB",
      panel: "КОНФИГ",
      importJson: "Импорт JSON",
      clearAll: "Очистить",
      workflowId: "Workflow ID",
      presetLabel: "Пресет",
      saveAsPreset: "Сохранить",
      execute: "Запуск",
      deploying: "Запуск...",
      control: "Управление",
      noTasks: "Нет задач",
      deleteNode: "Удалить узел",
      deleteField: "Удалить поле",
      confirmClear: "Очистить все?",
      selectNodesTitle: "Выбор узлов",
      importSelected: "Импорт",
      cancel: "Отмена",
      selectAll: "Все",
      deselectAll: "Ничего",
      presetManager: "Пресеты",
      savePreset: "Новый пресет",
      presetName: "Имя пресета",
      deletePreset: "Удалить",
      placeholderPreset: "Выберите...",
      modified: "ИЗМЕНЕНО",
      renamePlaceholder: "Переименовать"
    },
    analyze: {
      title: "Матрица",
      subtitle: "Реверс изображения в промпт",
      uploadTitle: "Загрузить",
      uploadSubtitle: "JPG, PNG, WEBP",
      dropToReplace: "ЗАМЕНИТЬ",
      analyzing: "Анализ...",
      changeImage: "Смена",
      initSequence: "Старт",
      retry: "Повтор",
      generatedPrompt: "ПРОМПТ",
      modifySubject: "ИЗМЕНИТЬ",
      modifyPlaceholder: "Объект...",
      applyModification: "ОК",
      modifying: "Смена...",
      versionHistory: "ИСТОРИЯ",
      original: "Оригинал",
      version: "Версия",
      importToTxt2Img: "Перенос",
      copywriting: "Текст",
    },
    txt2img: {
      title: "Текст в фото",
      promptPlaceholder: "Опишите...",
      generate: "Создать",
      generating: "Создание...",
      quantity: "Кол-во",
      productRef: "Ref продукта",
      charRef: "Ref персонажа",
      galleryTitle: "Галерея",
      delete: "Удалить"
    },
    presets: {
      title: "AI Портрет",
      selectStyle: "Выбрать стиль",
      uploadFace: "Загрузить лицо",
      uploadProduct: "Загрузить продукт",
      generate: "Создать",
      processing: "Обработка...",
      result: "Результат"
    },
    ref2img: {
      title: "Генерация по ссылке",
      refLabel: "Ссылка",
      refHint: "Нажмите для загрузки",
      promptLabel: "Промпт",
      model: "Модель",
      quality: "Качество",
      ratio: "Соотношение",
      quantity: "Кол-во",
      create: "Создать",
      generating: "Генерация...",
      emptyState: "Результат появится здесь"
    },
    img2img: {
      sourceImage: "Источник",
      modPrompt: "Инструкция",
      modPlaceholder: "Опишите изменения...",
      generate: "Изменить",
      processing: "В процессе...",
      outputPreview: "Предпросмотр",
      dropToReplace: "Заменить"
    }
  }
};
