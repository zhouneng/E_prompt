
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from './Button';
import { submitRHTask, pollRHTaskOutputs, uploadRHFile } from '../services/runningHubService';
import { Language, RHNodeInfo, RHTask, LightboxItem, RHPreset } from '../types';
import { TRANSLATIONS } from '../constants';

interface RunningHubViewProps {
  onViewImage: (items: LightboxItem[], index: number) => void;
  initialPrompt?: string;
  language: Language;
}

interface ImportField {
  fieldName: string;
  fieldValue: string;
  displayFieldName: string;
  selected: boolean;
}

interface ImportNode {
  nodeId: string;
  nodeTitle: string;
  displayNodeTitle: string;
  fields: ImportField[];
  selected: boolean;
}

const TaskTimer: React.FC<{ start: number; end?: number }> = ({ start, end }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (end) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [end]);
  const diff = Math.floor(((end || now) - start) / 1000);
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return <span className="font-mono">{m}:{s.toString().padStart(2, '0')}</span>;
};

export const RunningHubView: React.FC<RunningHubViewProps> = ({ onViewImage, initialPrompt, language }) => {
  const t = TRANSLATIONS[language].runninghub;
  
  // Base configuration
  const [workflowId, setWorkflowId] = useState(localStorage.getItem('rh_last_workflow_id') || "2003287354414661633");
  const [nodeList, setNodeList] = useState<RHNodeInfo[]>(() => {
    const saved = localStorage.getItem('rh_node_config');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Task history
  const [tasks, setTasks] = useState<RHTask[]>(() => {
    const saved = localStorage.getItem('rh_tasks');
    return saved ? JSON.parse(saved) : [];
  });

  // Preset system
  const [presets, setPresets] = useState<RHPreset[]>(() => {
    const saved = localStorage.getItem('rh_presets');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentPresetId, setCurrentPresetId] = useState<string>(localStorage.getItem('rh_current_preset_id') || "");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [tempImportNodes, setTempImportNodes] = useState<ImportNode[] | null>(null);

  const jsonInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeFileIndex = useRef<number | null>(null);

  // Poll task status
  useEffect(() => {
    const activeTasks = tasks.filter(t => t.status === 'PENDING' || t.status === 'RUNNING');
    if (activeTasks.length === 0) return;

    const interval = setInterval(async () => {
      let changed = false;
      const updatedTasks = await Promise.all(tasks.map(async (task) => {
        if (task.status === 'PENDING' || task.status === 'RUNNING') {
          try {
            const res = await pollRHTaskOutputs(task.taskId);
            changed = true;
            if (res.code === 0) {
              return { ...task, status: 'SUCCESS' as const, progress: 100, resultUrls: res.data.map((item: any) => item.fileUrl), endTime: Date.now() };
            } else if (res.code === 805) {
              return { ...task, status: 'FAILED' as const, errorMsg: res.msg || "FAILED", endTime: Date.now() };
            } else if (res.code === 804) {
              return { ...task, status: 'RUNNING' as const, progress: Math.min(95, (task.progress || 20) + 1) };
            }
          } catch (e) {}
        }
        return task;
      }));
      if (changed) setTasks(updatedTasks);
    }, 5000);
    return () => clearInterval(interval);
  }, [tasks]);

  // Persist state
  useEffect(() => {
    localStorage.setItem('rh_last_workflow_id', workflowId);
    localStorage.setItem('rh_node_config', JSON.stringify(nodeList));
    localStorage.setItem('rh_tasks', JSON.stringify(tasks));
    localStorage.setItem('rh_presets', JSON.stringify(presets));
    localStorage.setItem('rh_current_preset_id', currentPresetId);
  }, [workflowId, nodeList, tasks, presets, currentPresetId]);

  // Handle initial prompt injection
  useEffect(() => {
    if (initialPrompt && nodeList.length > 0) {
      const idx = nodeList.findIndex(n => {
        const name = (n.displayFieldName || n.fieldName).toLowerCase();
        return name.includes('text') || name.includes('prompt') || name.includes('提示词');
      });
      if (idx !== -1 && nodeList[idx].fieldValue !== initialPrompt) {
        const nl = [...nodeList];
        nl[idx].fieldValue = initialPrompt;
        setNodeList(nl);
      }
    }
  }, [initialPrompt]);

  const handleJsonFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const nodes: ImportNode[] = [];
        Object.entries(json).forEach(([nodeId, content]: [string, any]) => {
          const inputs = content.inputs || {};
          const nodeTitle = content._meta?.title || `Node ${nodeId}`;
          const fields: ImportField[] = [];
          Object.entries(inputs).forEach(([fieldName, fieldValue]) => {
             if (Array.isArray(fieldValue)) return; // Skip links
             fields.push({ 
               fieldName, 
               fieldValue: String(fieldValue), 
               displayFieldName: fieldName, 
               selected: true 
             });
          });
          if (fields.length > 0) {
            nodes.push({ 
              nodeId, 
              nodeTitle, 
              displayNodeTitle: nodeTitle, 
              fields, 
              selected: true 
            });
          }
        });
        setTempImportNodes(nodes);
      } catch (err) { alert("JSON parsing failed."); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const confirmImport = () => {
    if (!tempImportNodes) return;
    const selectedNodes = tempImportNodes.filter(n => n.selected);
    const newNodeList: RHNodeInfo[] = [];
    selectedNodes.forEach(node => {
      node.fields.filter(f => f.selected).forEach(f => {
        newNodeList.push({
          nodeId: node.nodeId,
          nodeTitle: node.nodeTitle,
          displayNodeTitle: node.displayNodeTitle,
          fieldName: f.fieldName,
          displayFieldName: f.displayFieldName,
          fieldValue: f.fieldValue,
          originalValue: f.fieldValue
        });
      });
    });
    setNodeList(newNodeList);
    setTempImportNodes(null);
    setCurrentPresetId("");
  };

  const handleSaveAsPreset = () => {
    const name = window.prompt(t.presetName, "My New Workflow");
    if (!name) return;
    const newId = crypto.randomUUID();
    const newPreset: RHPreset = {
      id: newId,
      name,
      workflowId,
      nodeList: JSON.parse(JSON.stringify(nodeList))
    };
    setPresets(prev => [newPreset, ...prev]);
    setCurrentPresetId(newId);
  };

  const loadPreset = (id: string) => {
    const p = presets.find(x => x.id === id);
    if (!p) return;
    setWorkflowId(p.workflowId);
    setNodeList(p.nodeList);
    setCurrentPresetId(id);
  };

  const handleClearAll = () => {
    if (window.confirm(t.confirmClear)) {
      setNodeList([]);
      setWorkflowId("");
      setCurrentPresetId("");
    }
  };

  const handleDeleteNode = (nodeId: string) => {
    setNodeList(prev => prev.filter(n => n.nodeId !== nodeId));
  };

  const updateNodeTitle = (nodeId: string, newTitle: string) => {
    setNodeList(prev => prev.map(n => n.nodeId === nodeId ? { ...n, displayNodeTitle: newTitle } : n));
  };

  const updateFieldTitle = (index: number, newTitle: string) => {
    setNodeList(prev => prev.map((n, i) => i === index ? { ...n, displayFieldName: newTitle } : n));
  };

  const handleRun = async () => {
    if (!workflowId.trim()) return alert("Please enter a Workflow ID");
    setIsSubmitting(true);
    try {
      const taskId = await submitRHTask(workflowId, nodeList);
      setTasks([{
        taskId, workflowKey: workflowId, status: 'PENDING', progress: 10,
        resultUrls: [], timestamp: Date.now(), startTime: Date.now()
      }, ...tasks]);
    } catch (e: any) { alert(e.message); }
    finally { setIsSubmitting(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || activeFileIndex.current === null) return;
    
    const idx = activeFileIndex.current;
    setUploadingIndex(idx);
    try {
      const fileName = await uploadRHFile(file);
      const nl = [...nodeList];
      nl[idx].fieldValue = fileName;
      setNodeList(nl);
    } catch (err: any) {
      alert(err.message || "Upload failed");
    } finally {
      setUploadingIndex(null);
      activeFileIndex.current = null;
      e.target.value = '';
    }
  };

  const isFileField = (name: string) => {
    const n = name.toLowerCase();
    return n.includes('image') || n.includes('video') || n.includes('audio') || n.includes('file');
  };

  const groupedNodes = useMemo(() => {
    const groups: Record<string, { id: string, title: string, displayTitle: string, fields: { originalIndex: number, data: RHNodeInfo }[] }> = {};
    nodeList.forEach((node, index) => {
      const key = node.nodeId;
      if (!groups[key]) {
          groups[key] = { id: key, title: node.nodeTitle, displayTitle: node.displayNodeTitle || node.nodeTitle, fields: [] };
      }
      groups[key].fields.push({ originalIndex: index, data: node });
    });
    return Object.values(groups);
  }, [nodeList]);

  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in duration-500 pb-12 max-w-[1600px] mx-auto">
      
      {/* Left Settings Panel - Styled to match screenshot */}
      <div className="w-full lg:w-[500px] flex flex-col gap-6">
        
        {/* Top Branding Area */}
        <div className="flex items-center justify-between px-2">
           <div className="space-y-0.5">
              <h2 className="text-xl font-black text-gray-800 tracking-tighter uppercase">{t.title}</h2>
              <div className="flex items-center gap-2">
                 <span className="w-1.5 h-1.5 bg-primary-400 rounded-full"></span>
                 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t.panel}</p>
              </div>
           </div>
           <div className="flex gap-2">
             <button 
               onClick={() => jsonInputRef.current?.click()}
               className="flex items-center gap-2 px-4 py-2 bg-white text-gray-600 rounded-2xl hover:bg-gray-50 transition-all border border-gray-100 text-xs font-bold shadow-soft"
             >
               <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
               {t.importJson}
             </button>
             <button 
                onClick={handleClearAll}
                className="p-2.5 bg-white text-red-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all border border-gray-100 shadow-soft"
             >
               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
             </button>
           </div>
           <input type="file" ref={jsonInputRef} onChange={handleJsonFileChange} className="hidden" accept=".json" />
        </div>

        {/* Global Cards */}
        <div className="space-y-4">
            {/* Workflow Preset */}
            <div className="bg-white p-6 rounded-[2rem] border border-gray-50 shadow-soft">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t.presetLabel}</label>
                  <button onClick={handleSaveAsPreset} className="text-[10px] font-black text-primary-400 hover:text-primary-600 transition-colors uppercase tracking-widest">+ {t.saveAsPreset}</button>
                </div>
                <div className="relative">
                  <select 
                    value={currentPresetId}
                    onChange={(e) => loadPreset(e.target.value)}
                    className="w-full h-12 bg-gray-50/50 border border-gray-100 rounded-2xl px-5 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-50 appearance-none font-bold pr-12 cursor-pointer"
                  >
                    <option value="">{t.placeholderPreset}</option>
                    {presets.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-5 pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
            </div>

            {/* Target ID */}
            <div className="bg-white p-6 rounded-[2rem] border border-gray-50 shadow-soft">
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-3 tracking-widest">{t.workflowId}</label>
                <input 
                  type="text" 
                  value={workflowId}
                  onChange={(e) => setWorkflowId(e.target.value)}
                  placeholder="2003287354414661633"
                  className="w-full h-12 bg-gray-50/50 border border-gray-100 rounded-2xl px-5 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-50 transition-all font-mono"
                />
            </div>
        </div>

        {/* Dynamic Nodes - Matching Screenshot Style */}
        <div className="space-y-10">
           {groupedNodes.map((node) => (
             <div key={node.id} className="space-y-4">
                {/* Node Section Header */}
                <div className="px-5 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <span className="w-2 h-2 bg-primary-400 rounded-full"></span>
                      <input 
                        value={node.displayTitle}
                        onChange={(e) => updateNodeTitle(node.id, e.target.value)}
                        className="text-[13px] font-black text-gray-600 uppercase tracking-widest bg-transparent border-b border-transparent hover:border-gray-200 focus:border-primary-200 focus:outline-none transition-all w-32"
                        placeholder="Rename Node..."
                      />
                      <span className="text-[10px] text-gray-300 font-mono font-bold tracking-widest">#{node.id}</span>
                   </div>
                   <button onClick={() => handleDeleteNode(node.id)} className="text-gray-200 hover:text-red-400 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                   </button>
                </div>

                {/* Field Cards */}
                <div className="space-y-4">
                   {node.fields.map((field) => (
                      <div key={field.originalIndex} className="bg-white rounded-[2.5rem] p-8 border border-gray-50 shadow-soft relative group">
                         <div className="flex justify-between items-center mb-4">
                            <input 
                              value={field.data.displayFieldName || field.data.fieldName}
                              onChange={(e) => updateFieldTitle(field.originalIndex, e.target.value)}
                              className="text-[11px] font-bold text-gray-400 uppercase tracking-widest bg-transparent border-b border-transparent hover:border-gray-100 focus:border-primary-200 focus:outline-none transition-all w-32"
                              placeholder="Field Name..."
                            />
                         </div>
                         <div className="relative">
                            <textarea 
                              value={field.data.fieldValue}
                              onChange={(e) => {
                                const nl = [...nodeList];
                                nl[field.originalIndex].fieldValue = e.target.value;
                                setNodeList(nl);
                              }}
                              className="w-full min-h-[100px] bg-gray-50/30 border border-gray-100/50 rounded-2xl p-5 text-[14px] text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-50/50 resize-none font-mono leading-relaxed"
                            />
                            {isFileField(field.data.fieldName) && (
                              <button 
                                onClick={() => { activeFileIndex.current = field.originalIndex; fileInputRef.current?.click(); }}
                                className={`absolute bottom-3 right-3 p-2.5 rounded-xl transition-all ${uploadingIndex === field.originalIndex ? 'bg-primary-500 animate-spin text-white shadow-glow' : 'bg-white hover:bg-primary-500 hover:text-white text-gray-400 border border-gray-100 shadow-sm'}`}
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                              </button>
                            )}
                         </div>
                      </div>
                   ))}
                </div>
             </div>
           ))}
        </div>

        {/* Big Action Button */}
        <div className="pt-4 px-2 pb-10">
           <Button 
             onClick={handleRun} 
             isLoading={isSubmitting} 
             disabled={!workflowId.trim() || nodeList.length === 0}
             className="w-full h-16 rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] italic shadow-glow transition-all active:scale-[0.98]"
           >
             {isSubmitting ? t.deploying : t.execute}
           </Button>
           <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
        </div>
      </div>

      {/* Right Monitor Panel */}
      <div className="flex-1 space-y-6">
         <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-gray-800 tracking-tighter uppercase italic">{t.control}</h3>
            {tasks.length > 0 && (
              <button onClick={() => setTasks([])} className="text-[10px] text-gray-300 hover:text-red-400 font-black tracking-widest flex items-center gap-1.5 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                WIPE HISTORY
              </button>
            )}
         </div>

         {tasks.length === 0 ? (
           <div className="h-[700px] bg-white border border-gray-50 rounded-[3rem] flex flex-col items-center justify-center text-gray-200 shadow-soft">
              <div className="w-24 h-24 mb-6 bg-gray-50/30 rounded-[2.5rem] flex items-center justify-center text-4xl italic font-black text-gray-100 rotate-12">RH</div>
              <p className="text-[10px] font-black uppercase tracking-widest">{t.noTasks}</p>
           </div>
         ) : (
           <div className="space-y-6">
              {tasks.map((task) => (
                <div key={task.taskId} className="bg-white border border-gray-100 rounded-[3rem] p-10 shadow-soft hover:shadow-xl transition-all overflow-hidden relative group">
                   <div className="flex flex-col md:flex-row justify-between gap-10">
                      <div className="flex-1 space-y-8">
                         <div className="flex flex-wrap items-center gap-4">
                            <span className="text-[10px] font-black bg-gray-800 text-white px-4 py-2 rounded-xl">ID: {task.taskId.slice(-8).toUpperCase()}</span>
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase border ${
                               task.status === 'SUCCESS' ? 'bg-green-50 text-green-500 border-green-100' :
                               task.status === 'FAILED' ? 'bg-red-50 text-red-500 border-red-100' : 'bg-primary-50 text-primary-500 border-primary-100'
                            }`}>
                               <span className={`w-2 h-2 rounded-full ${task.status === 'RUNNING' || task.status === 'PENDING' ? 'animate-pulse bg-current' : 'bg-current'}`}></span>
                               {task.status}
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-4 py-2 rounded-xl flex items-center gap-2">
                               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                               {task.startTime && <TaskTimer start={task.startTime} end={task.endTime} />}
                            </span>
                         </div>
                         {task.resultUrls.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                               {task.resultUrls.map((url, idx) => (
                                  <div key={idx} onClick={() => onViewImage(task.resultUrls.map(u => ({ id: u, url: u, title: 'Workflow Result' })), idx)}
                                    className="aspect-square rounded-[2rem] overflow-hidden bg-gray-50 border border-gray-100 cursor-pointer hover:scale-[1.05] transition-all shadow-md">
                                     <img src={url} className="w-full h-full object-cover" alt="Result" />
                                  </div>
                               ))}
                            </div>
                         )}
                         {task.errorMsg && <div className="p-5 bg-red-50 text-red-500 rounded-2xl text-[12px] font-mono leading-relaxed border border-red-100 shadow-inner">{task.errorMsg}</div>}
                      </div>
                      <div className="w-full md:w-48 flex flex-col justify-center items-center gap-6 bg-gray-50/30 rounded-[3rem] p-8 border border-gray-50/50 self-start">
                         <div className="relative w-24 h-24">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                               <circle cx="18" cy="18" r="16" fill="none" className="stroke-white" strokeWidth="4"></circle>
                               <circle cx="18" cy="18" r="16" fill="none" className={`${task.status === 'FAILED' ? 'stroke-red-400' : 'stroke-primary-400'} transition-all duration-1000`} strokeWidth="4" strokeDasharray={`${task.progress}, 100`} strokeLinecap="round"></circle>
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center text-sm font-black text-gray-800">{task.progress}%</div>
                         </div>
                         <div className="text-[11px] font-black text-gray-400 tracking-widest uppercase text-center leading-none">
                            {task.status === 'SUCCESS' ? 'COMPLETE' : (task.status === 'FAILED' ? 'ABORTED' : 'RUNNING')}
                         </div>
                      </div>
                   </div>
                </div>
              ))}
           </div>
         )}
      </div>

      {/* JSON Import Selection Modal */}
      {tempImportNodes && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-2xl z-[100] flex items-center justify-center p-4">
           <div className="bg-white rounded-[3.5rem] w-full max-w-2xl p-12 shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100 flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-gray-800 uppercase italic tracking-tighter">{t.selectNodesTitle}</h3>
                <div className="flex gap-4">
                   <button onClick={() => setTempImportNodes(prev => prev?.map(n => ({...n, selected: true})) || null)} className="text-[11px] font-black text-primary-500 uppercase tracking-widest">Select All</button>
                   <button onClick={() => setTempImportNodes(prev => prev?.map(n => ({...n, selected: false})) || null)} className="text-[11px] font-black text-gray-300 uppercase tracking-widest">Deselect All</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 space-y-6 no-scrollbar">
                {tempImportNodes.map((node, nodeIdx) => (
                  <div key={node.nodeId} className={`p-6 rounded-[2rem] border transition-all ${node.selected ? 'bg-white border-primary-200 shadow-md' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                    <div className="flex items-center gap-4 mb-4 border-b border-gray-50 pb-4">
                       <button onClick={() => { const next = [...tempImportNodes]; next[nodeIdx].selected = !next[nodeIdx].selected; setTempImportNodes(next); }}
                         className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${node.selected ? 'bg-primary-500 border-primary-500 text-white' : 'bg-white border-gray-200'}`}>
                          {node.selected && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                       </button>
                       <div className="flex-1">
                          <input 
                            value={node.displayNodeTitle}
                            onChange={(e) => { const next = [...tempImportNodes]; next[nodeIdx].displayNodeTitle = e.target.value; setTempImportNodes(next); }}
                            className="bg-transparent text-gray-800 font-black uppercase text-sm focus:outline-none focus:border-b focus:border-primary-400 w-full"
                            placeholder="Rename Node..."
                          />
                          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">ID: {node.nodeId}</div>
                       </div>
                    </div>
                    
                    <div className="space-y-2 pl-10">
                       {node.fields.map((field, fieldIdx) => (
                         <div key={field.fieldName} className="flex items-center gap-3 group">
                            <button onClick={() => { const next = [...tempImportNodes]; next[nodeIdx].fields[fieldIdx].selected = !next[nodeIdx].fields[fieldIdx].selected; setTempImportNodes(next); }}
                              className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${field.selected ? 'bg-primary-400 border-primary-400 text-white' : 'bg-white border-gray-200'}`}>
                               {field.selected && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                            </button>
                            <input 
                              value={field.displayFieldName}
                              onChange={(e) => { const next = [...tempImportNodes]; next[nodeIdx].fields[fieldIdx].displayFieldName = e.target.value; setTempImportNodes(next); }}
                              className="bg-transparent text-gray-600 text-xs font-bold focus:outline-none focus:border-b focus:border-primary-200 w-full"
                              placeholder="Alias..."
                            />
                         </div>
                       ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-6 mt-10 pt-10 border-t border-gray-50">
                <Button variant="secondary" onClick={() => setTempImportNodes(null)} className="h-16 rounded-[1.5rem] text-xs font-black uppercase tracking-widest">Cancel</Button>
                <Button onClick={confirmImport} disabled={!tempImportNodes.some(n => n.selected)} className="h-16 rounded-[1.5rem] text-xs font-black uppercase tracking-widest">Import Selection</Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
