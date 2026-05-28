export default function MapHeader({
    user, graph, status, isOwner,
    onTitleChange, onUndo, onRedo, canUndo, canRedo,
    onAutoLayout, onImport, onExport,
    onFit, onCopyURL, onSignOut, fileInputRef, onFileChange,
}) {
    const statusLabel = { ready: 'Saved', saving: 'Saving…', error: 'Error saving', loading: '' }
    const statusColor = { ready: 'text-green-500', saving: 'text-slate-400', error: 'text-red-500', loading: '' }

    return (
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-5 shrink-0">
            <div className="flex items-center gap-3">
                {user && (
                    <button onClick={() => location.href = '/'} className="text-slate-400 hover:text-slate-700 text-lg">←</button>
                )}
                <input
                    className="text-xl font-semibold bg-transparent outline-none border-b border-transparent focus:border-slate-300 px-1 disabled:cursor-default"
                    value={graph.title}
                    disabled={!isOwner}
                    onChange={e => onTitleChange(e.target.value)}
                />
                <span className={`text-sm ${statusColor[status]}`}>{statusLabel[status]}</span>
                {!isOwner && (
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full">View only</span>
                )}
            </div>
            <div className="flex gap-2">
                {isOwner && (
                    <>
                        <button onClick={onUndo} disabled={!canUndo}
                            className="px-3 py-2 rounded-xl border bg-white hover:bg-slate-100 disabled:opacity-30">
                            ↩ Undo
                        </button>
                        <button onClick={onRedo} disabled={!canRedo}
                            className="px-3 py-2 rounded-xl border bg-white hover:bg-slate-100 disabled:opacity-30">
                            ↪ Redo
                        </button>
                        <button onClick={onAutoLayout} className="px-3 py-2 rounded-xl border bg-white hover:bg-slate-100">Auto layout</button>
                        <button onClick={onImport} className="px-3 py-2 rounded-xl border bg-white hover:bg-slate-100">Import</button>
                        <button onClick={onExport} className="px-3 py-2 rounded-xl border bg-white hover:bg-slate-100">Export</button>
                    </>
                )}
                <button onClick={onFit} className="px-3 py-2 rounded-xl border bg-white hover:bg-slate-100">Fit</button>
                <button onClick={onCopyURL} className="px-3 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-700">Copy share URL</button>
                {user && <button onClick={onSignOut} className="px-3 py-2 rounded-xl border bg-white hover:bg-slate-100">Sign out</button>}
                <input ref={fileInputRef} type="file" accept=".json" hidden onChange={onFileChange} />
            </div>
        </header>
    )
}