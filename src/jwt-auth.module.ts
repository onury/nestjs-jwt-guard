import { type DynamicModule, Module, type Provider } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtAuthService } from './jwt-auth.service';
import {
  type JwtAuthAsyncOptions,
  type JwtAuthGuardBehavior,
  type JwtAuthOptions,
  resolveGuardOptions
} from './options';
import { JWT_AUTH_OPTIONS } from './tokens';

@Module({})
// biome-ignore lint/complexity/noStaticOnlyClass: NestJS dynamic modules are classes with static forRoot/forRootAsync
export class JwtAuthModule {
  /** Synchronous registration — pass the `@nestjs/jwt` config in `jwt`. */
  static forRoot(options: JwtAuthOptions): DynamicModule {
    return JwtAuthModule.build([JwtModule.register(options.jwt)], options);
  }

  /** Asynchronous registration — build the `@nestjs/jwt` config from injected deps. */
  static forRootAsync(options: JwtAuthAsyncOptions): DynamicModule {
    return JwtAuthModule.build(
      [
        JwtModule.registerAsync({
          imports: options.imports ?? [],
          inject: options.inject ?? [],
          useFactory: options.useFactory
        })
      ],
      options
    );
  }

  private static build(
    imports: NonNullable<DynamicModule['imports']>,
    behavior: JwtAuthGuardBehavior
  ): DynamicModule {
    const providers: Provider[] = [
      { provide: JWT_AUTH_OPTIONS, useValue: resolveGuardOptions(behavior) },
      JwtAuthGuard,
      JwtAuthService
    ];
    if (behavior.registerGuard ?? true) {
      providers.push({ provide: APP_GUARD, useExisting: JwtAuthGuard });
    }

    return {
      module: JwtAuthModule,
      global: behavior.isGlobal ?? true,
      imports,
      providers,
      exports: [JwtAuthGuard, JwtAuthService, JWT_AUTH_OPTIONS, JwtModule]
    };
  }
}
