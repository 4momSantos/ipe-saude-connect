export type FieldType = 
  | "text" 
  | "number" 
  | "email"
  | "cpf" 
  | "cnpj" 
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

export interface SelectOption {
  label: string;
  value: string;
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

export interface WorkflowNodeData extends Record<string, unknown> {
  label: string;
  type: "start" | "form" | "approval" | "notification" | "condition" | "end";
  color: string;
  icon: string;
  formFields?: FormField[];
  formTemplateId?: string;
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
