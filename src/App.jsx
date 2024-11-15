import { useState, useEffect, useRef } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import MDEditor from '@uiw/react-md-editor';
import toast, { Toaster } from 'react-hot-toast';
import {
  FiFolder,
  FiPlus,
  FiSave,
  FiTrash2,
  FiEdit2,
  FiChevronDown
} from 'react-icons/fi';
import { IoWarning } from 'react-icons/io5';
import {
  BsSortAlphaDown,
  BsClockHistory,
  BsPencilSquare
} from 'react-icons/bs';
import "./App.css";
import { Tooltip } from './components/Tooltip';

function formatTimestamp(timestamp, type = 'updated') {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffInHours = (now - date) / (1000 * 60 * 60);

  // Show relative time only for updates within last 24 hours
  if (type === 'updated' && diffInHours < 24) {
    if (diffInHours < 1) {
      const minutes = Math.floor((now - date) / (1000 * 60));
      return `${minutes} min${minutes !== 1 ? 's' : ''} ago`;
    }
    return `${Math.floor(diffInHours)}h ago`;
  } else {
    // Format date as "MMM DD, YYYY"
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };

    if (diffInHours < 24) {
      // For today's date, show time only
      return date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (date.getFullYear() === now.getFullYear()) {
      // If same year, omit the year
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
      });
    } else {
      // Show full date for older notes
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  }
}

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("darkMode") === "true";
  });

  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [editingTitle, setEditingTitle] = useState({
    id: null,
    tempTitle: ""
  });
  const [directoryHandle, setDirectoryHandle] = useState(null);
  const [isAutoSave, setIsAutoSave] = useState(() => {
    return localStorage.getItem("autoSave") === "true";
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const autoSaveTimerRef = useRef(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNoteChange, setPendingNoteChange] = useState(null);
  const [currentContent, setCurrentContent] = useState('');
  const [sortBy, setSortBy] = useState(() => {
    return localStorage.getItem("sortBy") || 'name';
  });
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Initialize directory handle and load notes
  useEffect(() => {
    const loadDirectory = async () => {
      try {
        // Try to get the stored directory handle
        const storedHandle = await localStorage.getItem('directoryHandle');
        if (storedHandle) {
          // Verify permission
          const handle = JSON.parse(storedHandle);
          const permission = await handle.requestPermission({ mode: 'readwrite' });
          if (permission === 'granted') {
            setDirectoryHandle(handle);
            await loadNotesFromDirectory(handle);
            return;
          }
        }
        // If no stored handle or permission denied, request new directory
        await selectDirectory();
      } catch (error) {
        console.error('Error loading directory:', error);
      }
    };

    loadDirectory();
  }, []);

  const selectDirectory = async () => {
    try {
      const handle = await window.showDirectoryPicker({
        mode: 'readwrite'
      });
      setDirectoryHandle(handle);
      localStorage.setItem('directoryHandle', JSON.stringify(handle));
      await loadNotesFromDirectory(handle);
    } catch (error) {
      console.error('Error selecting directory:', error);
      toast.error('Failed to select directory');
    }
  };

  const loadNotesFromDirectory = async (dirHandle) => {
    try {
      const loadedNotes = [];
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.md')) {
          const file = await entry.getFile();
          const content = await file.text();

          loadedNotes.push({
            id: Date.now() + Math.random(), // Ensure unique ID
            title: entry.name.replace('.md', ''),
            content,
            createdAt: file.lastModified, // Use file's lastModified as createdAt
            updatedAt: file.lastModified  // Use file's lastModified as initial updatedAt
          });
        }
      }
      setNotes(loadedNotes);
    } catch (error) {
      console.error('Error loading notes:', error);
      toast.error('Failed to load notes');
    }
  };

  const saveNote = async (noteId, content) => {
    try {
      const noteToSave = notes.find((note) => note.id === noteId);
      if (!noteToSave) {
        throw new Error('Note not found');
      }

      // Create updated note object with current content
      const updatedNote = {
        ...noteToSave,
        content: content || currentContent, // Use provided content or current content
        lastModified: Date.now()
      };

      // Save directly to the file system using the File System Access API
      const fileHandle = await directoryHandle.getFileHandle(
        `${updatedNote.title}.md`,
        { create: true }
      );
      const writable = await fileHandle.createWritable();
      await writable.write(updatedNote.content);
      await writable.close();

      // Update the notes array with the new content
      setNotes((prevNotes) =>
        prevNotes.map((note) =>
          note.id === updatedNote.id ? updatedNote : note
        )
      );

      // Show success message using toast
      toast.success('Note saved successfully!');
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Failed to save note');
    }
  };

  const addNote = async () => {
    if (!directoryHandle) return;

    const newNote = {
      id: Date.now().toString(),
      title: 'Untitled Note',
      content: '# Untitled Note\n\nStart writing here...'
    };

    try {
      const fileHandle = await directoryHandle.getFileHandle(
        `${newNote.title}.md`,
        { create: true }
      );
      const writable = await fileHandle.createWritable();
      await writable.write(newNote.content);
      await writable.close();

      setNotes([...notes, newNote]);
      setSelectedNote(newNote.id);
      setEditingTitle({ id: newNote.id, tempTitle: newNote.title });
      toast.success('New note created');
    } catch (error) {
      console.error('Error creating note:', error);
      toast.error('Failed to create note');
    }
  };

  const deleteNote = async (noteId) => {
    if (!directoryHandle) return;

    try {
      const note = notes.find((n) => n.id === noteId);
      await directoryHandle.removeEntry(`${note.title}.md`);

      const newNotes = notes.filter((note) => note.id !== noteId);
      setNotes(newNotes);
      if (selectedNote === noteId) {
        setSelectedNote(newNotes[0]?.id);
      }
      toast.success('Note deleted');
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    }
  };

  const startTitleEdit = (noteId, currentTitle) => {
    setEditingTitle({
      id: noteId,
      tempTitle: currentTitle
    });
  };

  const handleTitleEdit = (e) => {
    setEditingTitle((prev) => ({
      ...prev,
      tempTitle: e.target.value
    }));
  };

  const saveTitleEdit = async () => {
    if (!editingTitle.tempTitle.trim() || !directoryHandle) {
      cancelTitleEdit();
      return;
    }

    try {
      const oldNote = notes.find((n) => n.id === editingTitle.id);
      if (!oldNote) return;

      // Check if a file with new name already exists
      const newFileName = `${editingTitle.tempTitle.trim()}.md`;
      if (oldNote.title !== editingTitle.tempTitle.trim()) {
        try {
          const existingFile = await directoryHandle.getFileHandle(newFileName);
          if (existingFile) {
            toast.error('A note with this name already exists');
            return;
          }
        } catch (e) {
          // File doesn't exist, we can proceed
        }
      }

      // Delete old file
      const oldFileHandle = await directoryHandle.getFileHandle(
        `${oldNote.title}.md`
      );
      await oldFileHandle.remove();

      // Create new file with new title
      const fileHandle = await directoryHandle.getFileHandle(newFileName, {
        create: true
      });
      const writable = await fileHandle.createWritable();
      await writable.write(oldNote.content);
      await writable.close();

      const updatedNotes = notes.map((note) => {
        if (note.id === editingTitle.id) {
          return {
            ...note,
            title: editingTitle.tempTitle.trim(),
            updatedAt: Date.now()
          };
        }
        return note;
      });
      setNotes(updatedNotes);
      setEditingTitle({ id: null, tempTitle: '' });
      toast.success('Note renamed');
    } catch (error) {
      console.error('Error updating note title:', error);
      toast.error('Failed to rename note');
      cancelTitleEdit();
    }
  };

  const cancelTitleEdit = () => {
    setEditingTitle({ id: null, tempTitle: '' });
  };

  // Save autoSave preference
  useEffect(() => {
    localStorage.setItem('autoSave', isAutoSave);
  }, [isAutoSave]);

  // Handle auto-save
  useEffect(() => {
    if (isAutoSave && hasUnsavedChanges && selectedNote) {
      // Clear existing timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      // Set new timer
      autoSaveTimerRef.current = setTimeout(() => {
        saveNote(selectedNote, currentContent);
      }, 10000); // 10 seconds
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [isAutoSave, hasUnsavedChanges, selectedNote, currentContent]);

  // Add save shortcut (Ctrl/Cmd + S)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && selectedNote) {
        e.preventDefault();
        saveNote(selectedNote, currentContent);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedNote, currentContent]);

  const handleNoteChange = (noteId) => {
    if (hasUnsavedChanges) {
      setPendingNoteChange(noteId);
      setShowUnsavedDialog(true);
    } else {
      switchToNote(noteId);
    }
  };

  const switchToNote = (noteId) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      setSelectedNote(noteId);
      setCurrentContent(note.content);
      setHasUnsavedChanges(false);
    }
  };

  const handleUnsavedDialogAction = (action) => {
    if (action === 'save') {
      const note = notes.find(n => n.id === selectedNote);
      if (note) {
        saveNote(selectedNote, currentContent).then(() => {
          switchToNote(pendingNoteChange);
        });
      }
    } else if (action === 'discard') {
      switchToNote(pendingNoteChange);
    }
    setShowUnsavedDialog(false);
    setPendingNoteChange(null);
  };

  // Update the MDEditor onChange handler
  const handleEditorChange = (value) => {
    setCurrentContent(value);
    setHasUnsavedChanges(true);
  };

  // Update initial note loading
  useEffect(() => {
    if (selectedNote) {
      const note = notes.find(n => n.id === selectedNote);
      if (note) {
        setCurrentContent(note.content);
      }
    }
  }, [selectedNote, notes]);

  // Sort notes based on current sortBy value
  const sortedNotes = [...notes].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.title.localeCompare(b.title);
      case 'created':
        return (b.createdAt || 0) - (a.createdAt || 0);
      case 'updated':
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      default:
        return 0;
    }
  });

  // Close sort menu when clicking outside
  const sortMenuRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target)) {
        setShowSortMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Save sort preference
  useEffect(() => {
    localStorage.setItem("sortBy", sortBy);
  }, [sortBy]);

  return (
    <div className={`app-container ${darkMode ? 'dark-mode' : 'light-mode'}`} data-color-mode={darkMode ? 'dark' : 'light'}>
      <Toaster position="bottom-right" />
      <PanelGroup direction="horizontal">
        <Panel
          defaultSize={25}
          minSize={20}
          maxSize={40}
        >
          <div className="sidebar">
            <div className="sidebar-header">
              <div className="header-title">
                <h2>Notes</h2>
                <Tooltip content="Select storage folder" position="right">
                  <button
                    onClick={selectDirectory}
                    className="folder-button"
                  >
                    <FiFolder />
                  </button>
                </Tooltip>
              </div>
              <Tooltip content="Create new note" position="left">
                <button
                  onClick={addNote}
                  className="new-note-button"
                  disabled={!directoryHandle}
                >
                  <FiPlus /> New
                </button>
              </Tooltip>
            </div>

            <div className="sidebar-settings">
              <div className="toggles-container">
                <div className="toggle-group">
                  <label>Theme</label>
                  <div className="toggle-switch small">
                    <input
                      type="checkbox"
                      checked={darkMode}
                      onChange={() => setDarkMode(!darkMode)}
                      id="theme-toggle"
                    />
                    <label htmlFor="theme-toggle">
                      <span className="toggle-label">Light</span>
                      <span className="toggle-label">Dark</span>
                    </label>
                  </div>
                </div>

                <div className="toggle-group">
                  <label>Auto Save</label>
                  <div className="toggle-switch small">
                    <input
                      type="checkbox"
                      checked={isAutoSave}
                      onChange={() => setIsAutoSave(!isAutoSave)}
                      id="auto-save-toggle"
                    />
                    <label htmlFor="auto-save-toggle">
                      <span className="toggle-label">Off</span>
                      <span className="toggle-label">On</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="notes-header">
              <div className="sort-container" ref={sortMenuRef}>
                <button
                  className={`sort-button ${!directoryHandle ? 'disabled' : ''}`}
                  onClick={() => directoryHandle && setShowSortMenu(!showSortMenu)}
                  disabled={!directoryHandle}
                >
                  {sortBy === 'name' && <BsSortAlphaDown />}
                  {sortBy === 'created' && <BsClockHistory />}
                  {sortBy === 'updated' && <BsPencilSquare />}
                  <span>Sort by {sortBy === 'name' ? 'name' :
                    sortBy === 'created' ? 'creation date' :
                    'last updated'}</span>
                  <FiChevronDown className={`chevron ${showSortMenu ? 'open' : ''}`} />
                </button>

                {showSortMenu && directoryHandle && (
                  <div className="sort-menu">
                    <button
                      className={`sort-option ${sortBy === 'name' ? 'active' : ''}`}
                      onClick={() => {
                        setSortBy('name');
                        setShowSortMenu(false);
                      }}
                    >
                      <BsSortAlphaDown />
                      <span>Name</span>
                    </button>
                    <button
                      className={`sort-option ${sortBy === 'created' ? 'active' : ''}`}
                      onClick={() => {
                        setSortBy('created');
                        setShowSortMenu(false);
                      }}
                    >
                      <BsClockHistory />
                      <span>Created date</span>
                    </button>
                    <button
                      className={`sort-option ${sortBy === 'updated' ? 'active' : ''}`}
                      onClick={() => {
                        setSortBy('updated');
                        setShowSortMenu(false);
                      }}
                    >
                      <BsPencilSquare />
                      <span>Last updated</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {!directoryHandle && (
              <div className="no-folder-message">
                Select a folder to store your notes
              </div>
            )}

            <div className="notes-list">
              {sortedNotes.map(note => (
                <div
                  key={note.id}
                  className={`note-item ${selectedNote === note.id ? 'selected' : ''}`}
                  onClick={() => handleNoteChange(note.id)}
                >
                  <div className="note-title">
                    <div className="note-info">
                      {editingTitle.id === note.id ? (
                        <input
                          type="text"
                          value={editingTitle.tempTitle}
                          onChange={handleTitleEdit}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              saveTitleEdit();
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              cancelTitleEdit();
                            }
                          }}
                          onBlur={cancelTitleEdit}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                          className="title-input"
                        />
                      ) : (
                        <span className="note-name">
                          {note.title}
                          {selectedNote === note.id && hasUnsavedChanges && (
                            <span className="unsaved-dot">●</span>
                          )}
                        </span>
                      )}
                      <span className="note-timestamp">
                        {formatTimestamp(note.updatedAt)}
                      </span>
                    </div>
                    <div className="note-actions">
                      <Tooltip content="Rename note" position="top">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startTitleEdit(note.id, note.title);
                          }}
                          className="action-button edit"
                        >
                          <FiEdit2 size={16} />
                        </button>
                      </Tooltip>
                      <Tooltip content="Delete note" position="top">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNote(note.id);
                          }}
                          className="action-button delete"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <PanelResizeHandle className="resize-handle" />

        <Panel defaultSize={75}>
          <div className="editor-container">
            {selectedNote && (
              <>
                <MDEditor
                  value={currentContent}
                  onChange={handleEditorChange}
                  height="calc(100% - 30px)"
                  preview="edit"
                  placeholder=""
                  textareaProps={{
                    placeholder: ''
                  }}
                />
                {hasUnsavedChanges && !isAutoSave && (
                  <div className="floating-save-container">
                    <Tooltip content="Save changes (Ctrl + S)" position="left">
                      <button
                        className="floating-save-button"
                        onClick={() => saveNote(selectedNote, currentContent)}
                      >
                        <FiSave />
                      </button>
                    </Tooltip>
                  </div>
                )}
              </>
            )}
          </div>
        </Panel>
      </PanelGroup>

      {/* Unsaved Changes Dialog */}
      {showUnsavedDialog && (
        <div className="dialog-overlay">
          <div className="dialog">
            <div className="dialog-header">
              <IoWarning size={24} className="warning-icon" />
              <h3>Unsaved Changes</h3>
            </div>
            <p>You have unsaved changes in the current note. What would you like to do?</p>
            <div className="dialog-buttons">
              <button
                className="dialog-button secondary"
                onClick={() => handleUnsavedDialogAction('discard')}
              >
                Discard changes
              </button>
              <button
                className="dialog-button primary"
                onClick={() => handleUnsavedDialogAction('save')}
              >
                Save and continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
