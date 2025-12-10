import React from 'react';
import { FileNode } from '../types';
import { Folder, FileCode, ChevronRight, ChevronDown, FilePlus, FolderPlus, Trash2 } from 'lucide-react';
import { ContextMenu } from './ContextMenu';

interface FileTreeProps {
  nodes: FileNode[];
  onFileSelect: (path: string) => void;
  selectedPath: string | null;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
  // Context Menu Actions
  onCreateFile: (parentPath: string) => void;
  onCreateFolder: (parentPath: string) => void;
  onDelete: (path: string) => void;
}

// Wrapper to handle the "check set" logic cleanly in recursion
const RecursiveTreeNode: React.FC<{
  node: FileNode; 
  onSelect: (p: string) => void; 
  selectedPath: string | null;
  expandedPaths: Set<string>;
  onToggle: (p: string) => void;
  depth: number;
  onContextMenu: (e: React.MouseEvent, path: string, kind: 'file' | 'directory') => void;
}> = ({ node, onSelect, selectedPath, expandedPaths, onToggle, depth, onContextMenu }) => {
    
    const isExpanded = expandedPaths.has(node.path);

    return (
        <div>
            <div 
                className={`flex items-center py-1 px-2 cursor-pointer hover:bg-gray-800 border-l-2 ${selectedPath === node.path ? 'bg-blue-900/30 text-blue-300 border-blue-500' : 'text-gray-300 border-transparent'}`}
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                onClick={(e) => {
                    e.stopPropagation();
                    node.kind === 'directory' ? onToggle(node.path) : onSelect(node.path);
                }}
                onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onContextMenu(e, node.path, node.kind);
                }}
            >
                <span className="mr-1 opacity-70">
                {node.kind === 'directory' ? 
                    (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : 
                    <span className="w-3.5" />
                }
                </span>
                <span className="mr-2 text-blue-400">
                {node.kind === 'directory' ? <Folder size={16} /> : <FileCode size={16} />}
                </span>
                <span className="truncate text-sm select-none">{node.name}</span>
            </div>
            {isExpanded && node.children && (
                <div>
                {node.children.map(child => (
                    <RecursiveTreeNode 
                        key={child.path} 
                        node={child} 
                        onSelect={onSelect} 
                        selectedPath={selectedPath}
                        expandedPaths={expandedPaths}
                        onToggle={onToggle}
                        depth={depth + 1} 
                        onContextMenu={onContextMenu}
                    />
                ))}
                </div>
            )}
        </div>
    );
}

export const FileTree: React.FC<FileTreeProps> = ({ 
    nodes, onFileSelect, selectedPath, expandedPaths, onToggle,
    onCreateFile, onCreateFolder, onDelete
}) => {
  const [menu, setMenu] = React.useState<{ x: number; y: number; path: string; kind: 'file' | 'directory' } | null>(null);

  const handleContextMenu = (e: React.MouseEvent, path: string, kind: 'file' | 'directory') => {
      setMenu({ x: e.clientX, y: e.clientY, path, kind });
  };

  const handleRootContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      setMenu({ x: e.clientX, y: e.clientY, path: '', kind: 'directory' });
  };

  const menuOptions = menu ? [
      { 
          label: 'New File', 
          action: () => onCreateFile(menu.kind === 'directory' ? menu.path : menu.path.split('/').slice(0,-1).join('/')) 
      },
      { 
          label: 'New Folder', 
          action: () => onCreateFolder(menu.kind === 'directory' ? menu.path : menu.path.split('/').slice(0,-1).join('/')) 
      },
      ...(menu.path !== '' ? [{ 
          label: 'Delete', 
          danger: true,
          action: () => onDelete(menu.path) 
      }] : [])
  ] : [];

  return (
    <div className="overflow-y-auto h-full" onContextMenu={handleRootContextMenu}>
        {nodes.length === 0 && <div className="text-gray-500 text-sm p-4 text-center select-none">Right-click to start</div>}
        {nodes.map(node => (
          <RecursiveTreeNode 
            key={node.path} 
            node={node} 
            onSelect={onFileSelect} 
            selectedPath={selectedPath}
            expandedPaths={expandedPaths}
            onToggle={onToggle}
            depth={0} 
            onContextMenu={handleContextMenu}
          />
        ))}
        
        {menu && (
            <ContextMenu 
                x={menu.x} 
                y={menu.y} 
                options={menuOptions} 
                onClose={() => setMenu(null)} 
            />
        )}
    </div>
  );
};
