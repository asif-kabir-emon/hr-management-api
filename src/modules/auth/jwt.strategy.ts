import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';
import { CurrentUser } from './interfaces/current-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      passReqToCallback: true,
      secretOrKey: configService.get<string>('jwt.secret'),
    });
  }

  async validate(req: Request, payload: CurrentUser): Promise<CurrentUser> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid access token');
    }

    const user = await this.userRepository.findOne({
      where: {
        id: payload.sub,
      },
    });

    if (!user || !user.isActive || user.isDelete) {
      throw new UnauthorizedException('User is no longer allowed to access this resource');
    }

    const accessToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

    if (!accessToken) {
      throw new UnauthorizedException('Access token is missing');
    }

    await this.authService.validateAccessSession(
      user.id,
      payload.sessionId ?? (payload as CurrentUser & { sid?: string }).sid,
      accessToken,
    );

    return {
      sub: user.id,
      id: user.id,
      sessionId:
        payload.sessionId ?? (payload as CurrentUser & { sid?: string }).sid,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      permissions: user.permissions ?? [],
      type: 'access',
      isActive: user.isActive,
    };
  }
}
