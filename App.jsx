import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, CheckCircle, History, Edit2, Save, Trash2, Plus, X, FolderPlus, ChevronDown, ChevronUp } from 'lucide-react';

// --- Default Data (Cleaned up for new users) ---
const DEFAULT_CATEGORIES = [
  { id: 'c1', name: 'General Interest', color: 'text-amber-400 border-amber-500/30' },
];

const DEFAULT_TASKS = [
  { id: 't1', categoryId: 'c1', channel: 'Example Channel', duration: 600, timeLeft: 600, isRunning: false, completed: false },
];

const COLORS = [
  'text-amber-400 border-amber-500/30',
  'text-red-400 border-red-500/30', 
  'text-emerald-400 border-emerald-500/30',
  'text-blue-400 border-blue-500/30',
  'text-orange-400 border-orange-500/30',
  'text-purple-400 border-purple-500/30',
  'text-pink-400 border-pink-500/30',
  'text-cyan-400 border-cyan-500/30',
];

const App = () => {
  // --- State Initialization with Migration Logic ---
  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('cultureSyncCategories');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });

  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('cultureSyncTasks');
    let parsedTasks = saved ? JSON.parse(saved) : DEFAULT_TASKS;

    // Migration: If tasks don't have categoryId (from v1), map them using 'language'
    if (parsedTasks.length > 0 && !parsedTasks[0].categoryId) {
      // If migrating from old version with specific languages, try to map or default to the first category
      const defaultCats = DEFAULT_CATEGORIES; 
      parsedTasks = parsedTasks.map(t => {
        // Simple fallback since we removed specific default categories
        return { ...t, categoryId: 'c1' }; 
      });
    }
    return parsedTasks;
  });

  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('cultureSyncHistory');
    return saved ? JSON.parse(saved) : [];
  });

  const [lastVisit, setLastVisit] = useState(() => {
    return localStorage.getItem('cultureSyncLastVisit') || new Date().toDateString();
  });

  // --- UI State ---
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingCatId, setEditingCatId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editTime, setEditTime] = useState(10);
  const [showHistory, setShowHistory] = useState(false);
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // --- Persistence ---
  useEffect(() => {
    localStorage.setItem('cultureSyncTasks', JSON.stringify(tasks));
    localStorage.setItem('cultureSyncCategories', JSON.stringify(categories));
    localStorage.setItem('cultureSyncHistory', JSON.stringify(history));
    localStorage.setItem('cultureSyncLastVisit', lastVisit);
  }, [tasks, categories, history, lastVisit]);

  // --- Daily Reset Logic ---
  useEffect(() => {
    const today = new Date().toDateString();
    if (lastVisit !== today) {
      const completedCount = tasks.filter(t => t.completed).length;
      const totalCount = tasks.length;
      
      if (completedCount > 0) {
        const logEntry = {
          date: lastVisit,
          summary: `Completed ${completedCount}/${totalCount} items across ${categories.length} categories.`,
          relevance: Math.round((completedCount / totalCount) * 100)
        };
        setHistory(prev => [logEntry, ...prev].slice(0, 30));
      }

      setTasks(prev => prev.map(t => ({
        ...t,
        completed: false,
        isRunning: false,
        timeLeft: t.duration
      })));

      setLastVisit(today);
    }
  }, [lastVisit, tasks, categories.length]);

  // --- Timer Logic ---
  useEffect(() => {
    const interval = setInterval(() => {
      setTasks(prevTasks => prevTasks.map(task => {
        if (task.isRunning && task.timeLeft > 0) {
          return { ...task, timeLeft: task.timeLeft - 1 };
        } else if (task.isRunning && task.timeLeft === 0) {
          return { ...task, isRunning: false, completed: true };
        }
        return task;
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // --- Handlers: Tasks ---
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTimer = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, isRunning: !t.isRunning } : t));
  };

  const resetTimer = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, isRunning: false, timeLeft: t.duration } : t));
  };

  const toggleComplete = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id) => {
    if (confirm('Remove this channel?')) {
      setTasks(prev => prev.filter(t => t.id !== id));
    }
  };

  const addTask = (categoryId) => {
    const newTask = {
      id: Date.now().toString(),
      categoryId,
      channel: 'New Channel',
      duration: 600,
      timeLeft: 600,
      isRunning: false,
      completed: false
    };
    setTasks(prev => [...prev, newTask]);
    startEditingTask(newTask); // Immediately edit
  };

  // --- Handlers: Task Editing ---
  const startEditingTask = (task) => {
    setEditingTaskId(task.id);
    setEditName(task.channel);
    setEditTime(Math.floor(task.duration / 60));
    setEditingCatId(null); // Close other edits
  };

  const saveTaskEdit = (id) => {
    setTasks(prev => prev.map(t => 
      t.id === id ? { 
        ...t, 
        channel: editName, 
        duration: editTime * 60, 
        timeLeft: editTime * 60, 
        isRunning: false
      } : t
    ));
    setEditingTaskId(null);
  };

  // --- Handlers: Categories ---
  const addCategory = () => {
    if (!newCatName.trim()) return;
    const color = COLORS[categories.length % COLORS.length];
    const newCat = {
      id: `c-${Date.now()}`,
      name: newCatName,
      color
    };
    setCategories([...categories, newCat]);
    setNewCatName('');
    setShowAddCat(false);
  };

  const deleteCategory = (id) => {
    if (confirm('Delete this category and all its tasks?')) {
      setCategories(prev => prev.filter(c => c.id !== id));
      setTasks(prev => prev.filter(t => t.categoryId !== id));
    }
  };

  const startEditingCategory = (cat) => {
    setEditingCatId(cat.id);
    setEditName(cat.name);
    setEditingTaskId(null);
  };

  const saveCategoryEdit = (id) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, name: editName } : c));
    setEditingCatId(null);
  };

  const relevanceScore = tasks.length > 0 
    ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 pb-32">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-end border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              CultureSync <span className="text-xs text-slate-500 font-normal">v2.1</span>
            </h1>
            <p className="text-xs text-slate-400">Relevance Tracker</p>
          </div>
          <div className="text-right">
             <span className="text-xs font-mono text-slate-400">{new Date().toLocaleDateString()}</span>
          </div>
        </div>

        {/* Relevance Meter */}
        <div className="bg-slate-900 rounded-xl p-4 shadow-lg border border-slate-800">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-slate-300">Daily Relevance</span>
            <span className="text-sm font-bold text-cyan-400">{relevanceScore}%</span>
          </div>
          <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all duration-500"
              style={{ width: `${relevanceScore}%` }}
            ></div>
          </div>
        </div>

        {/* Categories & Tasks */}
        <div className="space-y-6">
          {categories.map(cat => (
            <div key={cat.id} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              
              {/* Category Header */}
              <div className={`flex items-center justify-between mb-2 pb-1 border-b ${cat.color} border-opacity-30`}>
                {editingCatId === cat.id ? (
                   <div className="flex items-center gap-2 flex-1">
                     <input 
                        autoFocus
                        type="text" 
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="bg-slate-900 text-white px-2 py-1 text-sm rounded border border-slate-700 w-full focus:outline-none focus:border-indigo-500"
                     />
                     <button onClick={() => saveCategoryEdit(cat.id)} className="text-green-400"><Save size={16}/></button>
                   </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className={`font-bold uppercase tracking-wider text-sm ${cat.color.split(' ')[0]}`}>
                      {cat.name}
                    </h2>
                    <button onClick={() => startEditingCategory(cat)} className="text-slate-600 hover:text-slate-400">
                      <Edit2 size={12} />
                    </button>
                  </div>
                )}
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => addTask(cat.id)}
                    className="text-slate-400 hover:text-white flex items-center gap-1 text-xs bg-slate-800 px-2 py-1 rounded hover:bg-slate-700 transition-colors"
                  >
                    <Plus size={12} /> Add Channel
                  </button>
                  <button onClick={() => deleteCategory(cat.id)} className="text-slate-600 hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Tasks in Category */}
              <div className="space-y-3">
                {tasks.filter(t => t.categoryId === cat.id).map(task => (
                  <div 
                    key={task.id} 
                    className={`relative bg-slate-900 rounded-lg p-3 border transition-all ${
                      task.completed ? 'border-green-900 bg-slate-900/50 opacity-70' : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {editingTaskId === task.id ? (
                      // Edit Task Mode
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                           <h4 className="text-xs text-slate-500 uppercase font-bold">Edit Channel</h4>
                           <button onClick={() => deleteTask(task.id)} className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1">
                             <Trash2 size={12}/> Delete
                           </button>
                        </div>
                        <input 
                          type="text" 
                          value={editName} 
                          onChange={(e) => setEditName(e.target.value)}
                          className="bg-black/20 border border-slate-700 rounded p-2 text-sm focus:outline-none focus:border-cyan-500 text-white"
                          placeholder="Channel Name"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">Mins:</span>
                          <input 
                            type="number" 
                            value={editTime} 
                            onChange={(e) => setEditTime(Number(e.target.value))}
                            className="bg-black/20 border border-slate-700 rounded p-2 text-sm w-16 focus:outline-none focus:border-cyan-500 text-white"
                          />
                          <button onClick={() => saveTaskEdit(task.id)} className="ml-auto bg-green-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-green-500">
                            SAVE
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View Task Mode
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 mr-2">
                          <h3 className={`font-medium text-base truncate ${task.completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                            {task.channel}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <button onClick={() => startEditingTask(task)} className="text-slate-600 hover:text-cyan-400 text-[10px] flex items-center gap-1">
                              <Edit2 size={10} /> EDIT
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className={`font-mono text-lg ${task.timeLeft < 60 && !task.completed ? 'text-red-400 animate-pulse' : 'text-slate-400'}`}>
                            {formatTime(task.timeLeft)}
                          </div>
                          
                          {!task.completed && (
                            <div className="flex gap-1">
                              <button 
                                onClick={() => toggleTimer(task.id)}
                                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${task.isRunning ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                              >
                                {task.isRunning ? <Pause size={14} /> : <Play size={14} />}
                              </button>
                              <button 
                                onClick={() => resetTimer(task.id)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700"
                              >
                                <RotateCcw size={14} />
                              </button>
                            </div>
                          )}
                          
                           <button 
                            onClick={() => toggleComplete(task.id)}
                            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${
                              task.completed 
                              ? 'bg-green-500 text-white' 
                              : 'bg-slate-800 text-slate-600 hover:bg-slate-700 border border-slate-700'
                            }`}
                          >
                            <CheckCircle size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {tasks.filter(t => t.categoryId === cat.id).length === 0 && (
                   <div className="text-center py-2 text-xs text-slate-600 border border-dashed border-slate-800 rounded">
                      No channels yet. Add one!
                   </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add Category Button */}
        {showAddCat ? (
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 animate-in zoom-in-95 duration-200">
            <h3 className="text-sm font-bold text-slate-300 mb-2">New Category Name</h3>
            <input 
              autoFocus
              type="text" 
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="e.g., Politics, Tech, Gaming"
              className="w-full bg-black/30 border border-slate-600 rounded p-2 text-white mb-3 focus:border-cyan-500 focus:outline-none"
            />
            <div className="flex gap-2">
              <button onClick={addCategory} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded text-sm font-bold">Create</button>
              <button onClick={() => setShowAddCat(false)} className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"><X size={18}/></button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setShowAddCat(true)}
            className="w-full py-3 border-2 border-dashed border-slate-800 rounded-xl text-slate-500 hover:text-slate-300 hover:border-slate-600 flex items-center justify-center gap-2 transition-all"
          >
            <FolderPlus size={20} />
            Add New Category
          </button>
        )}

        {/* History Toggle */}
        <div className="pt-6 border-t border-slate-800">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 mx-auto"
          >
            <History size={14} />
            {showHistory ? "Hide Logs" : "Show History"}
          </button>

          {showHistory && (
            <div className="mt-4 space-y-2">
              {history.length === 0 ? (
                <p className="text-center text-xs text-slate-600">No history found.</p>
              ) : (
                history.map((log, idx) => (
                  <div key={idx} className="bg-slate-900 p-3 rounded border border-slate-800 flex justify-between items-center">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">{log.date}</div>
                      <div className="text-xs text-slate-300">{log.summary}</div>
                    </div>
                    <div className={`text-xs font-bold px-2 py-1 rounded ${log.relevance > 80 ? 'bg-green-900/30 text-green-400' : 'bg-slate-800 text-slate-500'}`}>
                      {log.relevance}%
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default App;
