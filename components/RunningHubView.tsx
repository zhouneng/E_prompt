
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from './Button';
import { submitRHTask, pollRHTaskOutputs, uploadRHFile } from '../services/runningHubService';
import { Language, RHNodeInfo, RHTask, LightboxItem } from '../types';
import { TRANSLATIONS } from '../constants';

interface RunningHubViewProps {
  onViewImage: (items: LightboxItem[], index: number) => void;
  initialPrompt?: string;
  language: Language;
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
  
  const [workflowId, setWorkflowId] = useState(localStorage.getItem('rh_last_workflow_id') || "");
  const [nodeList, setNodeList] = useState<RHNodeInfo[]>(() => {
    const saved = localStorage.getItem('rh_node_config');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [tasks, setTasks] = useState<RHTask[]>(() => {
    const saved = localStorage.getItem('rh_tasks');
    return saved ? JSON.parse(saved) : [];
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const jsonInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeFileIndex = useRef<number | null>(null);

  // 任务轮询逻辑 (严格遵循手册 code 逻辑)
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
            
            if (res.code === 0) { // 成功
              return { 
                ...task, 
                status: 'SUCCESS' as const, 
                progress: 100, 
                resultUrls: res.data.map((item: any) => item.fileUrl),
                endTime: Date.now() 
              };
            } else if (res.code === 805) { // 失败
              const reason = res.data?.failedReason?.exception_message || res.msg || "Execution Failed";
              return { ...task, status: 'FAILED' as const, errorMsg: reason, endTime: Date.now() };
            } else if (res.code === 804) { // 运行中
              return { ...task, status: 'RUNNING' as const, progress: Math.min(95, (task.progress || 20) + 1) };
            } else if (res.code === 813) { // 排队中
              return { ...task, status: 'PENDING' as const, progress: 10 };
            }
          } catch (e) {
            console.error("Poll Error:", e);
          }
        }
        return task;
      }));

      if (changed) setTasks(updatedTasks);
    }, 5000);

    return () => clearInterval(interval);
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('rh_last_workflow_id', workflowId);
    localStorage.setItem('rh_node_config', JSON.stringify(nodeList));
    localStorage.setItem('rh_tasks', JSON.stringify(tasks));
  }, [workflowId, nodeList, tasks]);

  // 同步图像反推的提示词
  useEffect(() => {
    if (initialPrompt && nodeList.length > 0) {
      const idx = nodeList.findIndex(n => n.fieldName.toLowerCase().includes('text') || n.fieldName.toLowerCase().includes('prompt'));
      if (idx !== -1 && nodeList[idx].fieldValue !== initialPrompt) {
        const nl = [...nodeList];
        nl[idx].fieldValue = initialPrompt;
        setNodeList(nl);
      }
    }
  }, [initialPrompt]);

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const newNodeList: RHNodeInfo[] = [];
        
        Object.entries(json).forEach(([nodeId, content]: [string, any]) => {
          const inputs = content.inputs || {};
          const nodeTitle = content._meta?.title || `Node ${nodeId}`;
          
          Object.entries(inputs).forEach(([fieldName, fieldValue]) => {
             // 核心过滤：ComfyUI 连接信息是数组 [nodeId, index]，必须排除
             if (Array.isArray(fieldValue)) return;
             
             const val = String(fieldValue);
             newNodeList.push({
               nodeId,
               nodeTitle,
               fieldName,
               fieldValue: val,
               originalValue: val
             });
          });
        });
        setNodeList(newNodeList);
      } catch (err) {
        alert("JSON 解析失败，请确认导入的是 ComfyUI API JSON 文件。");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const index = activeFileIndex.current;
    if (!file || index === null) return;
    
    setUploadingIndex(index);
    try {
      const fileName = await uploadRHFile(file);
      const nl = [...nodeList];
      nl[index].fieldValue = fileName;
      setNodeList(nl);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploadingIndex(null);
      activeFileIndex.current = null;
    }
    e.target.value = '';
  };

  const handleRun = async () => {
    if (!workflowId.trim()) return alert("请输入 Workflow ID");
    setIsSubmitting(true);
    try {
      // 仅提交被修改过的参数以减少错误率，如果没修改则提交全部
      const modified = nodeList.filter(n => n.fieldValue !== n.originalValue);
      const payload = modified.length > 0 ? modified : nodeList;

      const taskId = await submitRHTask(workflowId, payload);
      setTasks([{
        taskId,
        workflowKey: workflowId,
        status: 'PENDING',
        progress: 10,
        resultUrls: [],
        timestamp: Date.now(),
        startTime: Date.now()
      }, ...tasks]);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFileField = (name: string) => {
    const n = name.toLowerCase();
    return n.includes('image') || n.includes('video') || n.includes('audio') || n.includes('file');
  };

  const groupedNodes = useMemo(() => {
    const groups: Record<string, RHNodeInfo[]> = {};
    nodeList.forEach(node => {
      const key = `${node.nodeTitle} (#${node.nodeId})`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(node);
    });
    return groups;
  }, [nodeList]);

  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in duration-500">
      
      {/* 侧边设置栏 */}
      <div className="w-full lg:w-[450px] bg-[#0c0d10] rounded-[2.5rem] p-8 flex flex-col gap-6 border border-white/5 ring-1 ring-white/10 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
           <div className="space-y-1">
              <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">RunningHub</h2>
              <p className="text-[10px] text-primary-500 font-bold uppercase tracking-widest">Automation Engine</p>
           </div>
           <button 
             onClick={() => jsonInputRef.current?.click()}
             className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-xl text-[10px] font-black hover:bg-primary-500 transition-all uppercase"
           >
             Import API JSON
           </button>
           <input type="file" ref={jsonInputRef} onChange={handleImportJson} className="hidden" accept=".json" />
        </div>

        <div className="space-y-4 overflow-y-auto no-scrollbar max-h-[600px] pr-1">
           <div className="bg-white/5 p-5 rounded-3xl border border-white/5">
              <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">Target Workflow ID</label>
              <input 
                type="text" 
                value={workflowId}
                onChange={(e) => setWorkflowId(e.target.value)}
                placeholder="Workflow ID from Link..."
                className="w-full h-11 bg-black/40 border border-white/10 rounded-xl px-4 text-primary-400 text-sm focus:outline-none focus:border-primary-500 transition-all font-mono"
              />
           </div>

           <div className="space-y-6">
              {Object.entries(groupedNodes).map(([title, fields]) => (
                <div key={title} className="space-y-3">
                   <div className="px-2 text-[10px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-2">
                     <span className="w-1.5 h-1.5 bg-gray-700 rounded-full"></span>
                     {title}
                   </div>
                   <div className="space-y-2">
                      {fields.map((field) => {
                         const idx = nodeList.indexOf(field);
                         const isChanged = field.fieldValue !== field.originalValue;
                         return (
                           <div key={field.fieldName} className={`p-4 rounded-2xl border transition-all ${isChanged ? 'bg-primary-500/5 border-primary-500/20' : 'bg-white/[0.02] border-white/5'}`}>
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-bold text-gray-500 uppercase">{field.fieldName}</span>
                                {isChanged && <span className="text-[8px] bg-primary-500/20 text-primary-400 px-1.5 py-0.5 rounded-full font-black animate-pulse">MODIFIED</span>}
                              </div>
                              <div className="relative">
                                <textarea 
                                  value={field.fieldValue}
                                  onChange={(e) => {
                                    const nl = [...nodeList];
                                    nl[idx].fieldValue = e.target.value;
                                    setNodeList(nl);
                                  }}
                                  className="w-full h-16 bg-black/40 border border-white/5 rounded-xl p-3 text-[10px] text-gray-400 focus:outline-none focus:border-primary-500/50 resize-none font-mono"
                                />
                                {isFileField(field.fieldName) && (
                                  <button 
                                    onClick={() => { activeFileIndex.current = idx; fileInputRef.current?.click(); }}
                                    className={`absolute bottom-2 right-2 p-2 rounded-lg transition-all ${uploadingIndex === idx ? 'bg-primary-500 animate-spin' : 'bg-white/10 hover:bg-primary-500'} text-white shadow-lg`}
                                  >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                  </button>
                                )}
                              </div>
                           </div>
                         );
                      })}
                   </div>
                </div>
              ))}
           </div>
        </div>

        <div className="mt-auto pt-6 border-t border-white/5">
           <Button 
             onClick={handleRun} 
             isLoading={isSubmitting} 
             disabled={!workflowId.trim() || nodeList.length === 0}
             className="w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest italic"
           >
             {isSubmitting ? "INITIATING..." : "START WORKFLOW"}
           </Button>
           <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
        </div>
      </div>

      {/* 监控主面板 */}
      <div className="flex-1 space-y-6">
         <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-gray-800 tracking-tighter uppercase italic">Mission Control</h3>
            {tasks.length > 0 && <button onClick={() => setTasks([])} className="text-[10px] text-gray-400 hover:text-red-500 font-black tracking-widest">WIPE HISTORY</button>}
         </div>

         {tasks.length === 0 ? (
           <div className="h-[550px] bg-white border border-gray-100 rounded-[2.5rem] flex flex-col items-center justify-center text-gray-300 shadow-soft">
              <div className="w-20 h-20 mb-6 bg-gray-50 rounded-full flex items-center justify-center text-3xl italic font-black text-gray-200">RH</div>
              <p className="text-xs font-black uppercase tracking-widest">System Idle</p>
           </div>
         ) : (
           <div className="space-y-4">
              {tasks.map((task) => (
                <div key={task.taskId} className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-soft hover:ring-1 ring-primary-500/20 transition-all overflow-hidden relative group">
                   <div className="absolute top-0 right-0 p-8 opacity-[0.03] select-none pointer-events-none text-6xl font-black italic">{task.status}</div>
                   
                   <div className="flex flex-col md:flex-row justify-between gap-6">
                      <div className="flex-1 space-y-5">
                         <div className="flex flex-wrap items-center gap-3">
                            <span className="text-[10px] font-black bg-gray-900 text-white px-3 py-1 rounded-full">TASK ID: {task.taskId.slice(-8)}</span>
                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                               task.status === 'SUCCESS' ? 'bg-green-100 text-green-600' :
                               task.status === 'FAILED' ? 'bg-red-100 text-red-600' :
                               'bg-primary-100 text-primary-600'
                            }`}>
                               <span className={`w-1.5 h-1.5 rounded-full ${task.status === 'RUNNING' || task.status === 'PENDING' ? 'animate-pulse bg-current' : 'bg-current'}`}></span>
                               {task.status}
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
                               {task.startTime && <TaskTimer start={task.startTime} end={task.endTime} />}
                            </span>
                         </div>

                         {task.errorMsg && (
                           <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-[10px] text-red-600 font-mono leading-relaxed">
                              <span className="font-black uppercase block mb-1">Execution Failure:</span>
                              {task.errorMsg}
                           </div>
                         )}

                         {task.resultUrls.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                               {task.resultUrls.map((url, idx) => (
                                  <div 
                                    key={idx} 
                                    onClick={() => onViewImage(task.resultUrls.map(u => ({ id: u, url: u, title: 'Workflow Result' })), idx)}
                                    className="aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 cursor-pointer hover:ring-4 ring-primary-500/20 transition-all"
                                  >
                                     <img src={url} className="w-full h-full object-cover" alt="Result" />
                                  </div>
                               ))}
                            </div>
                         )}
                      </div>

                      <div className="w-full md:w-36 flex flex-col justify-center items-center gap-3 bg-gray-50/50 rounded-[2rem] p-4">
                         <div className="relative w-16 h-16">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                               <circle cx="18" cy="18" r="16" fill="none" className="stroke-gray-100" strokeWidth="3"></circle>
                               <circle 
                                 cx="18" cy="18" r="16" fill="none" 
                                 className={`${task.status === 'FAILED' ? 'stroke-red-500' : 'stroke-primary-500'} transition-all duration-1000`} 
                                 strokeWidth="3" 
                                 strokeDasharray={`${task.progress}, 100`} 
                                 strokeLinecap="round"
                               ></circle>
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black">{task.progress}%</div>
                         </div>
                         <div className="text-[9px] font-black text-gray-400 tracking-widest uppercase text-center">
                            {task.status === 'SUCCESS' ? 'FINISHED' : (task.status === 'FAILED' ? 'HALTED' : 'PROCESSING')}
                         </div>
                      </div>
                   </div>
                   {(task.status === 'RUNNING' || task.status === 'PENDING') && (
                     <div className="absolute bottom-0 left-0 h-1 bg-primary-500 animate-scan w-full opacity-20"></div>
                   )}
                </div>
              ))}
           </div>
         )}
      </div>
    </div>
  );
};
