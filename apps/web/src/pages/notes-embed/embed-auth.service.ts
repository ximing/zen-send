import { Service } from '@rabjs/react';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';

export class EmbedAuthService extends Service {
  ready = false;

  get authService() {
    return this.resolve(AuthService);
  }

  get socketService() {
    return this.resolve(SocketService);
  }

  initFromToken(accessToken: string, userId: string, userName: string): void {
    this.authService.accessToken = accessToken;
    this.authService.user = { id: userId, email: '', nickname: userName };
    this.socketService.connect();
    this.ready = true;
  }
}
