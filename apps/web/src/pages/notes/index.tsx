import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { observer, useService } from '@rabjs/react';
import { NoteService } from '../../services/note.service';
import NoteEditor from './components/note-editor';
import NoteEmptyState from './components/note-empty-state';

function NotesPage() {
  const { id } = useParams<{ id: string }>();
  const noteService = useService(NoteService);

  useEffect(() => {
    if (id && id !== noteService.currentNoteId) {
      if (noteService._saveNowFn) noteService._saveNowFn();
      noteService.loadNote(id);
    }
  }, [id]);

  if (!id) {
    return <NoteEmptyState />;
  }

  return <NoteEditor />;
}

export default observer(NotesPage);
