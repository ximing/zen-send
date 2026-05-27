import { JsonController, Get, Param, HttpError } from 'routing-controllers';
import { Service } from 'typedi';
import { NoteService } from '../services/note.service.js';
import { ResponseUtil } from '../utils/response.js';

@JsonController('/api/notes/share')
@Service()
export class ShareController {
  constructor(private noteService: NoteService) {}

  @Get('/:token')
  async getSharedNote(@Param('token') token: string) {
    const note = await this.noteService.getNoteByShareToken(token);
    if (!note) {
      throw new HttpError(404, 'Shared note not found or sharing has been disabled');
    }
    return ResponseUtil.success(note);
  }
}
