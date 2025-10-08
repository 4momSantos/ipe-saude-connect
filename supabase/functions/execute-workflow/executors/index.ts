/**
 * Factory/Registry para executores de nós
 * Implementa o padrão Strategy para isolamento de responsabilidades
 */

import { NodeExecutor } from './types.ts';
import { StartExecutor } from './start-executor.ts';
import { FormExecutor } from './form-executor.ts';
import { EmailExecutor } from './email-executor.ts';
import { WebhookExecutor } from './webhook-executor.ts';
import { DatabaseExecutor } from './database-executor.ts';
import { SignatureExecutor } from './signature-executor.ts';
import { OcrExecutor } from './ocr-executor.ts';
import { ApprovalExecutor } from './approval-executor.ts';
import { ConditionExecutor } from './condition-executor.ts';
import { EndExecutor } from './end-executor.ts';
import { LoopExecutor } from './loop-executor.ts';

/**
 * Registry de executores por tipo de nó
 */
const executorRegistry: Map<string, NodeExecutor> = new Map([
  ['start', new StartExecutor()],
  ['form', new FormExecutor()],
  ['email', new EmailExecutor()],
  ['webhook', new WebhookExecutor()],
  ['http', new WebhookExecutor()], // HTTP usa o mesmo executor que webhook
  ['database', new DatabaseExecutor()],
  ['signature', new SignatureExecutor()],
  ['ocr', new OcrExecutor()],
  ['approval', new ApprovalExecutor()],
  ['condition', new ConditionExecutor()],
  ['end', new EndExecutor()],
  ['loop', new LoopExecutor()],
]);

/**
 * Retorna o executor apropriado para um tipo de nó
 */
export function getExecutor(nodeType: string): NodeExecutor {
  const executor = executorRegistry.get(nodeType);
  
  if (!executor) {
    throw new Error(`Executor não encontrado para tipo de nó: ${nodeType}`);
  }
  
  return executor;
}

/**
 * Verifica se existe executor para um tipo de nó
 */
export function hasExecutor(nodeType: string): boolean {
  return executorRegistry.has(nodeType);
}
