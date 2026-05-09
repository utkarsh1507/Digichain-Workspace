import { useState, useRef } from 'react';
import { Upload, Folder, FileText, File, FileSpreadsheet, Image, Trash2, Download, Pin, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Card, Button, IconBtn, Eyebrow, Section, Modal, Select, Avatar, Empty, fmtDate } from '../components/ui';

const FOLDERS = [
  { id: 'HR Policies',    name: 'HR Policies',    color: '#2563eb' },
  { id: 'Technical Docs', name: 'Technical Docs',  color: '#7B61FF' },
  { id: 'Reports',        name: 'Reports',         color: '#16a371' },
  { id: 'Payslips',       name: 'Payslips',        color: '#d97706' },
  { id: 'Legal',          name: 'Legal',           color: '#e0364c', founderOnly: true },
  { id: 'General',        name: 'General',         color: '#9a9aa8' },
];

const TYPE_COLORS = {
  PDF: '#e0364c', Word: '#2563eb', Excel: '#16a371', PowerPoint: '#e05f36',
  Image: '#7B61FF', Archive: '#9a9aa8', Other: '#9a9aa8',
};

function FileIcon({ type, size = 20 }) {
  const color = TYPE_COLORS[type] || '#9a9aa8';
  if (type === 'Image') return <Image size={size} color={color} />;
  if (type === 'Excel') return <FileSpreadsheet size={size} color={color} />;
  if (['PDF', 'Word', 'PowerPoint'].includes(type)) return <FileText size={size} color={color} />;
  return <File size={size} color={color} />;
}

export default function Documents() {
  const { state, uploadDocument, deleteDocument } = useApp();
  const { currentUser, documents, users } = state;
  const isFounder = currentUser?.role === 'founder';
  const canUpload = ['founder', 'employee'].includes(currentUser?.role);

  const [activeFolder, setActiveFolder] = useState(null);
  const [search, setSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [folder, setFolder] = useState('General');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const visibleFolders = FOLDERS.filter(f => !f.founderOnly || isFounder);

  const shownDocs = documents.filter(d => {
    const folderOk = !activeFolder || d.folder === activeFolder;
    const accessOk = d.folder !== 'Legal' || isFounder;
    const searchOk = !search || d.name.toLowerCase().includes(search.toLowerCase());
    return folderOk && accessOk && searchOk;
  });

  async function handleUpload(e) {
    e.preventDefault();
    if (!selectedFile) return;
    setUploading(true);
    try {
      await uploadDocument(selectedFile, folder, '');
      setSelectedFile(null);
      setFolder('General');
      setUploadOpen(false);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this file?')) return;
    try { await deleteDocument(id); } catch (err) { alert(err.message); }
  }

  return (
    <div style={{ display: 'flex', gap: 24, maxWidth: 1300, margin: '0 auto', height: 'calc(100vh - 56px - 56px)' }} className="fade-in">
      {/* Folder sidebar */}
      <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ marginBottom: 8 }}>
          <Eyebrow>Documents</Eyebrow>
          <h2 style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 700 }}>Files</h2>
        </div>
        {canUpload && (
          <Button variant="primary" icon={Upload} onClick={() => setUploadOpen(true)} style={{ width: '100%', justifyContent: 'center', marginBottom: 12 }}>
            Upload File
          </Button>
        )}
        <div onClick={() => setActiveFolder(null)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
            background: !activeFolder ? 'var(--accent-tint)' : 'transparent',
            color: !activeFolder ? 'var(--accent-press)' : 'var(--fg-2)', fontWeight: !activeFolder ? 600 : 500, fontSize: 13 }}>
          <Folder size={16} />All Files
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--fg-4)' }}>{documents.length}</span>
        </div>
        {visibleFolders.map(f => (
          <div key={f.id} onClick={() => setActiveFolder(f.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
              background: activeFolder === f.id ? 'var(--accent-tint)' : 'transparent',
              color: activeFolder === f.id ? 'var(--accent-press)' : 'var(--fg-2)',
              fontWeight: activeFolder === f.id ? 600 : 500, fontSize: 13, transition: 'background 120ms' }}
            onMouseEnter={e => { if (activeFolder !== f.id) e.currentTarget.style.background = 'var(--bg-2)'; }}
            onMouseLeave={e => { if (activeFolder !== f.id) e.currentTarget.style.background = 'transparent'; }}>
            <span style={{ width: 18, height: 18, borderRadius: 4, background: f.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <Folder size={10} color="#fff" />
            </span>
            {f.name}
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--fg-4)' }}>
              {documents.filter(d => d.folder === f.id).length}
            </span>
          </div>
        ))}
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0, overflow: 'auto' }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#fff',
          border: '1px solid var(--border-1)', borderRadius: 10 }}>
          <Search size={15} color="var(--fg-3)" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search files…"
            style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontFamily: 'inherit', fontSize: 14, color: 'var(--fg-1)' }} />
        </div>

        {/* File list */}
        <Card padded={false}>
          <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 100px 120px 90px auto', gap: 12,
            padding: '10px 16px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-1)' }}>
            {['', 'Name', 'Size', 'Uploaded by', 'Date', ''].map((h, i) => (
              <span key={i} style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--fg-3)', textTransform: 'uppercase' }}>{h}</span>
            ))}
          </div>
          {shownDocs.length === 0
            ? <Empty icon={Folder} title="No files" hint="Upload a file or check a different folder." />
            : shownDocs.map((d, i) => {
              const uploader = d.uploader || users.find(u => u.id === d.uploaderId);
              const canDelete = isFounder || uploader?.id === currentUser?.id;
              return (
                <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 100px 120px 90px auto', gap: 12,
                  alignItems: 'center', padding: '12px 16px', borderBottom: i < shownDocs.length - 1 ? '1px solid var(--border-1)' : 'none',
                  transition: 'background 120ms' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <FileIcon type={d.type} size={20} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 2 }}>{d.folder}</div>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-3)' }}>{d.size}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Avatar name={uploader?.name || '?'} size={20} src={uploader?.avatar} />
                    <span style={{ fontSize: 12, color: 'var(--fg-2)' }}>{uploader?.name?.split(' ')[0]}</span>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{fmtDate(d.uploadedAt || d.createdAt)}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {d.url && d.url !== '#' && (
                      <a href={d.url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', textDecoration: 'none' }}>
                        <IconBtn icon={Download} size={28} title="Download" />
                      </a>
                    )}
                    {canDelete && <IconBtn icon={Trash2} size={28} title="Delete" onClick={() => handleDelete(d.id)} />}
                  </div>
                </div>
              );
            })}
        </Card>
      </div>

      {/* Upload modal */}
      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload File">
        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ border: '2px dashed var(--border-2)', borderRadius: 12, padding: 32, textAlign: 'center', cursor: 'pointer',
            background: 'var(--bg-1)' }} onClick={() => fileRef.current?.click()}>
            <Upload size={32} color="var(--fg-4)" style={{ margin: '0 auto 8px' }} />
            {selectedFile ? (
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-1)' }}>{selectedFile.name}</div>
                <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 4 }}>
                  {(selectedFile.size / 1024).toFixed(0)} KB · Click to change
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-2)' }}>Click to select a file</div>
                <div style={{ fontSize: 12, color: 'var(--fg-4)', marginTop: 4 }}>PDF, DOCX, XLSX, images — max 50MB</div>
              </div>
            )}
            <input ref={fileRef} type="file" style={{ display: 'none' }}
              onChange={e => { if (e.target.files[0]) setSelectedFile(e.target.files[0]); }} />
          </div>
          <Select label="Folder" value={folder} onChange={e => setFolder(e.target.value)}
            options={visibleFolders.map(f => ({ value: f.id, label: f.name }))} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" icon={Upload} disabled={!selectedFile || uploading}>
              {uploading ? 'Uploading…' : 'Upload'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
