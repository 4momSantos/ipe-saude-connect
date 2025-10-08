export type FieldType = 
  | "text" 
  | "number" 
  | "email"
  | "cpf" 
  | "cnpj" 
  | "crm"
  | "nit"
  | "cep"
  | "rg"
  | "phone"
  | "date" 
  | "file" 
  | "checkbox" 
  | "select" 
  | "textarea";

export type FieldSize = "full" | "half" | "third";

export interface FieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  customMessage?: string;
}

export interface APIFieldConfig {
  enableValidation?: boolean;
  enableAutoFill?: boolean;
  autoFillFields?: string[]; // IDs of fields to auto-fill
  validateOnBlur?: boolean;
}

export interface SelectOption {
  label: string;
  value: string;
}

export interface OCRFieldMapping {
  ocrField: string;        // Campo extraído do OCR (ex: "cpf", "nome", "data_nascimento")
  formFieldId?: string;    // ID do campo do formulário para comparação
  validateAPI?: string;    // API para validação (ex: "validate-cpf", "validate-crm")
  required: boolean;       // Se o campo é obrigatório no OCR
  errorMessage?: string;   // Mensagem customizada de erro
}

export interface OCRConfig {
  enabled: boolean;
  documentType: "rg" | "cnh" | "cpf" | "crm" | "cnpj" | "comprovante_endereco" | "diploma" | "certidao";
  expectedFields: OCRFieldMapping[];
  minConfidence: number;   // Confiança mínima para aceitar (0-100)
  autoValidate: boolean;   // Validar automaticamente após extração
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  size: FieldSize;
  validation?: FieldValidation;
  options?: SelectOption[];
  helpText?: string;
  conditionalRules?: ConditionalRule[];
  apiConfig?: APIFieldConfig;
  acceptedFiles?: string; // For file type
  maxFileSize?: number; // For file type in MB
  ocrConfig?: OCRConfig;
}

export interface ConditionalRule {
  fieldId: string;
  operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
  value: any;
  action: "show" | "hide" | "require";
}

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  fields: FormField[];
  createdAt: string;
  updatedAt: string;
}

export interface TriggerConfig {
  type: "database" | "webhook" | "manual" | "schedule";
  table?: string;
  event?: "INSERT" | "UPDATE" | "DELETE";
  conditions?: Record<string, any>;
  webhookUrl?: string;
  schedule?: string; // cron expression
}

export type NodeType = 
  | "start" 
  | "form" 
  | "approval" 
  | "notification" 
  | "condition" 
  | "end"
  | "webhook"
  | "http"
  | "signature"
  | "email"
  | "database"
  | "loop";

export interface WebhookConfig {
  url?: string;
  method: "GET" | "POST";
  headers?: Record<string, string>;
  responseMapping?: Record<string, string>;
}

export interface HttpConfig {
  url?: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: string;
  authentication?: {
    type: "none" | "bearer" | "basic" | "apiKey";
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    apiKeyHeader?: string;
  };
}

export interface SignatureConfig {
  documentTemplateId?: string;
  signers: Array<{
    name: string;
    email: string;
    order: number;
  }>;
  provider: "manual" | "assinafy" | "clicksign" | "docusign";
  notifyOnComplete?: boolean;
  notifyCandidate?: boolean;
  notifyAnalysts?: boolean;
}

export interface EmailConfig {
  to?: string;
  subject?: string;
  body?: string;
  cc?: string;
  bcc?: string;
  useTemplate?: boolean;
  templateId?: string;
  attachments?: string[];
}

export interface DatabaseConfig {
  operation: "insert" | "update" | "select" | "delete";
  table?: string;
  conditions?: Array<{
    field: string;
    operator: "equals" | "not_equals" | "greater_than" | "less_than" | "contains";
    value: string;
  }>;
  fields?: Record<string, string>;
}

export interface ApprovalConfig {
  assignmentType: "all" | "specific";
  assignedAnalysts?: string[];
}

export interface ConditionConfig {
  assignmentType: "all" | "specific";
  assignedAnalysts?: string[];
  question?: string;
  description?: string;
}

export interface LoopConfig {
  items: string;                    // Expressão para array: "{{http_response.data}}"
  executionMode: 'sequential' | 'parallel';
  maxConcurrency?: number;          // Apenas para modo parallel (default: 5)
  itemVariable: string;             // Nome da variável (default: "currentItem")
  indexVariable?: string;           // Nome do índice (default: "index")
  continueOnError: boolean;         // Continuar se uma iteração falhar
  iterationTimeout?: number;        // Timeout em ms por iteração (default: 30000)
  checkpointEvery?: number;         // Checkpoint a cada N iterações (default: 100)
  loopBody?: {
    startNodeId: string;            // ID do primeiro nó do corpo do loop
    endNodeId: string;              // ID do último nó do corpo do loop
  };
}

export interface WorkflowNodeData extends Record<string, unknown> {
  label: string;
  type: NodeType;
  color: string;
  icon: string;
  description?: string;
  category?: string;
  status?: "pending" | "completed" | "active";
  formFields?: FormField[];
  formTemplateId?: string;
  webhookConfig?: WebhookConfig;
  httpConfig?: HttpConfig;
  signatureConfig?: SignatureConfig;
  emailConfig?: EmailConfig;
  databaseConfig?: DatabaseConfig;
  approvalConfig?: ApprovalConfig;
  conditionConfig?: ConditionConfig;
  triggerConfig?: TriggerConfig;
  loopConfig?: LoopConfig;
  config?: Record<string, any>;
}

export interface VisualWorkflow {
  id: string;
  name: string;
  description: string;
  nodes: any[]; // ReactFlow nodes
  edges: any[]; // ReactFlow edges
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  version: number;
}
