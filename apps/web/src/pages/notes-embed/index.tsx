import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { observer, useService } from '@rabjs/react';
import { EmbedAuthService } from './embed-auth.service';
import { NoteService } from '../../services/note.service';
import NoteEditor from '../notes/components/note-editor';

function NoteEmbedPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const embedAuthService = useService(EmbedAuthService);
  const noteService = useService(NoteService);

  useEffect(() => {
    if (!id) return;
    const accessToken = searchParams.get('access_token') ?? '';
    const userId = searchParams.get('user_id') ?? '';
    const userName = decodeURIComponent(searchParams.get('user_name') ?? 'Mobile User');
    if (accessToken && !embedAuthService.ready) {
      embedAuthService.initFromToken(accessToken, userId, userName);
      noteService.loadNote(id);
    }
  }, []);

  if (!embedAuthService.ready) {
    return (
      <div
        className="flex h-screen items-center justify-center"
        style={{ background: 'var(--bg-primary)' }}
      >
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          加载中...
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col" style={{ background: 'var(--bg-primary)' }}>
      <NoteEditor />
    </div>
  );
}

export default observer(NoteEmbedPage);
