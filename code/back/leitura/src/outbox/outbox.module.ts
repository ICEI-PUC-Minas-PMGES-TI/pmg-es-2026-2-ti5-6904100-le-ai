import { Global, Module } from '@nestjs/common';
import { OutboxRepository } from './outbox.repository';

@Global()
@Module({
  providers: [OutboxRepository],
  exports: [OutboxRepository],
})
export class OutboxModule {}
