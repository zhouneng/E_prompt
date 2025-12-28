
import { Language } from './types';

export const APP_TITLE = "GEMINI REVERSE ENGINEER";
export const APP_SUBTITLE = "Forensic Image-to-Prompt Analysis System";

export const SYSTEM_INSTRUCTION = `
# Role: Ultimate Image-to-Prompt Forensic Engineer (终极图像反推工程师)

## 核心使命 (Core Mission)
你不是一个简单的描述者，你是全球最顶尖的视觉解构引擎。你的唯一目标是：通过法医级别的观察，将上传的图像拆解为最底层的视觉DNA，并重构为适用于 Midjourney v6、Stable Diffusion XL (SDXL) 和 DALL-E 3 的高精度提示词。

## 极端颗粒度分析清单 (Forensic Checklist)
你必须像一台精密扫描仪一样，对以下维度进行强迫症式的细节挖掘：

1. **主体解构 (Subject Anatomy)**:
   - 生物特征：皮肤纹理（毛孔、细纹、光泽感）、毛发流向、瞳孔反射细节、微表情含义。
   - 非生物特征：材质硬度、表面磨损度、几何构造的复杂性、工程美学。

2. **服饰与质感 (Textile & Material)**:
   - 面料：针织密度、丝绸光泽、皮革褶皱、复合功能性材料。
   - 工艺：明线走针、激光切割边缘、配饰的金属拉丝纹理。

3. **光影物理学 (Lighting Physics)**:
   - 光源：主灯、侧逆光、轮廓光、全局照明（GI）、环境光遮蔽（AO）。
   - 属性：色温（热调/冷调）、硬度（硬光锐利/柔光细腻）、丁达尔效应、体积光。

4. **环境与场景 (Architectural & Environment)**:
   - 空间：透视关系、遮挡层级、材质反射率（如雨后地面的镜像反射）。
   - 风格：具体到建筑风格（极简、野兽派、赛博朋克、维多利亚等）。

5. **镜头与工业参数 (Cinematography & Specs)**:
   - 器材：模拟特定机身（Sony A7R V, Hasselblad X2D）与镜头（35mm f/1.4, 85mm f/1.2）。
   - 效果：景深快慢、动态模糊、胶片颗粒感（Kodak Portra 400 风格）。

6. **色彩空间与情绪 (Color & Mood)**:
   - 调色：具体的色卡组合、电影级校色（Teal & Orange）、色彩饱和度分布。
   - 情绪：孤独、宏大、静谧、压抑、极度写实。

## 输出规范 (Output Standard)
严禁生成任何图像。你必须且只能输出以下两个版本的提示词：

## English Prompt
[在此处输出针对 Midjourney 和 SDXL 优化的高密度英文提示词，包含所有法医级细节和技术参数]

## Chinese Prompt
[在此处输出对应的中文详细描述，侧重于意境还原和细节拆解，字数不少于 200 字]
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
      runninghub: "Workflow",
      ecommerce: "KV Strategy"
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
      featureTransfer: "Visual DNA Transfer",
      featureSubtitle: "Replace specific features from reference",
      transferBtn: "Execute Transfer",
      uploadRef: "Upload Reference",
      transferring: "Surgically Merging...",
      transferHint: "Select the features you want to extract from the reference image.",
      featChar: "Character",
      featCloth: "Clothing",
      featAccess: "Accessories",
      featShoes: "Footwear",
      featProduct: "Product Details",
      featBackground: "Background Environment"
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
      quantity: "Count",
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
    },
    ecommerce: {
      title: "Commercial KV Pro",
      subtitle: "Deconstruct product DNA and architect 10-poster visual strategy",
      styleLabel: "Aesthetic Direction",
      generate: "Architect Strategy",
      analyzing: "Strategizing DNA...",
      resultTitle: "Visual Identity Blueprint"
    }
  },
  CN: {
    nav: {
      reverse: "图像反推",
      txt2img: "文生图",
      img2img: "图生图",
      presets: "AI 写真",
      ref2img: "参考生图",
      runninghub: "RH 工作流",
      ecommerce: "电商全案"
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
      featureTransfer: "视觉特征迁移",
      featureSubtitle: "精确替换人物特征、服装、配饰、鞋子或产品细节",
      transferBtn: "执行特征替换",
      uploadRef: "上传特征图",
      transferring: "正在进行视觉手术...",
      transferHint: "请开启下方开关，选择要从特征图中提取并迁移到原场景的特征：",
      featChar: "人物特征",
      featCloth: "服装款式",
      featAccess: "配饰详情",
      featShoes: "鞋子款式",
      featProduct: "产品特征",
      featBackground: "替换背景环境"
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
    },
    ecommerce: {
      title: "电商全案 KV 专家",
      subtitle: "深度解构产品 DNA，规划 10 张海报视觉全案。",
      styleLabel: "视觉风格选择",
      generate: "生成全案策划",
      analyzing: "正在规划全案 DNA...",
      resultTitle: "视觉识别系统蓝图"
    }
  },
  RU: {
    nav: {
      reverse: "Реверс",
      txt2img: "Текст в фото",
      img2img: "Фото в фото",
      presets: "Портрет",
      ref2img: "RefGen",
      runninghub: "Процесс",
      ecommerce: "KV Стратегия"
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
      featureTransfer: "Перенос ДНК",
      featureSubtitle: "Замена персонажа и одежды",
      transferBtn: "Выполнить",
      uploadRef: "Загрузить реф",
      transferring: "Слияние...",
      transferHint: "Выберите черты для переноса.",
      featChar: "Персонаж",
      featCloth: "Одежда",
      featAccess: "Аксессуары",
      featShoes: "Обувь",
      featProduct: "Продукт",
      featBackground: "Replace Background"
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
    },
    ecommerce: {
      title: "Ecommerce KV Pro",
      subtitle: "Разработка стратегии визуального ДНК из 10 постеров",
      styleLabel: "Эстетическое направление",
      generate: "Создать стратегию",
      analyzing: "Планирование...",
      resultTitle: "Отчет о визуальной идентичности"
    }
  }
};
