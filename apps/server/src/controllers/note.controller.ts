import { JsonController, Get, Post, Patch, Delete, Body, Param, CurrentUser, Authorized, HttpError } from 'routing-controllers';
import { Service } from 'typedi';
import { NoteService } from '../services/note.service.js';
import { CreateNoteDto, UpdateNoteDto, ReorderNotesDto } from '../validators/note.validator.js';
import { ResponseUtil } from '../utils/response.js';
import type { TokenPayload } from '../utils/jwt.js';

@JsonController('/api/notes')
@Service()
@Authorized()
export class NoteController {
  constructor(private noteService: NoteService) {}

  @Get('')
  async list(@CurrentUser() user: TokenPayload) {
    const notes = await this.noteService.getUserNotes(user.userId);
    return ResponseUtil.success(notes);
  }

  @Get('/:id')
  async getOne(@Param('id') id: string, @CurrentUser() user: TokenPayload) {
    const note = await this.noteService.getNoteById(id, user.userId);
    if (!note) {
      throw new HttpError(404, 'Note not found');
    }
    return ResponseUtil.success(note);
  }

  @Post('')
  async create(@Body() dto: CreateNoteDto, @CurrentUser() user: TokenPayload) {
    const note = await this.noteService.createNote(user.userId, dto);
    return ResponseUtil.created(note);
  }

  @Patch('/reorder')
  async reorder(@Body() dto: ReorderNotesDto, @CurrentUser() user: TokenPayload) {
    await this.noteService.reorderNotes(user.userId, dto.orders);
    return ResponseUtil.success(null);
  }

  @Patch('/:id')
  async update(@Param('id') id: string, @Body() dto: UpdateNoteDto, @CurrentUser() user: TokenPayload) {
    const updated = await this.noteService.updateNote(id, user.userId, dto);
    if (!updated) {
      throw new HttpError(404, 'Note not found');
    }
    return ResponseUtil.success({ id });
  }

  @Delete('/:id')
  async remove(@Param('id') id: string, @CurrentUser() user: TokenPayload) {
    const deleted = await this.noteService.deleteNote(id, user.userId);
    if (!deleted) {
      throw new HttpError(404, 'Note not found');
    }
    return ResponseUtil.success({ id });
  }
}
