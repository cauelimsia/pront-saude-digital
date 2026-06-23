import {
  User,
  Stethoscope,
  Smile,
  Pill,
  Building2,
  Hospital,
  MessageCircle,
  ShieldCheck,
  Brain,
  CalendarCheck,
  FileText,
  Activity,
  type LucideIcon,
} from "lucide-react";

export type Segment = {
  id: string;
  label: string;
  tagline: string;
  icon: LucideIcon;
  href: string;
};

// Segmentos do ecossistema (espelha a home do pront.app)
export const segments: Segment[] = [
  {
    id: "paciente",
    label: "Sou Paciente",
    tagline: "Médicos e dentistas online, 24h",
    icon: User,
    href: "/cadastro?perfil=paciente",
  },
  {
    id: "medico",
    label: "Sou Médico",
    tagline: "Atenda de qualquer lugar. 7 dias grátis",
    icon: Stethoscope,
    href: "/cadastro?perfil=medico",
  },
  {
    id: "dentista",
    label: "Sou Dentista",
    tagline: "Teleodontologia com IA e triagem",
    icon: Smile,
    href: "/cadastro?perfil=dentista",
  },
  {
    id: "farmacia",
    label: "Sou Farmácia",
    tagline: "Receba receitas digitais automaticamente",
    icon: Pill,
    href: "/cadastro?perfil=farmacia",
  },
  {
    id: "clinica",
    label: "Tenho Clínica",
    tagline: "Gestão completa + telemedicina integrada",
    icon: Building2,
    href: "/cadastro?perfil=clinica",
  },
  {
    id: "hospital",
    label: "Sou Hospital",
    tagline: "ERP hospitalar com IA preditiva e TISS/SUS",
    icon: Hospital,
    href: "/cadastro?perfil=hospital",
  },
];

export type Feature = {
  title: string;
  description: string;
  icon: LucideIcon;
};

// "Ecossistema Pront"
export const ecosystem: Feature[] = [
  {
    title: "WhatsApp-First",
    description:
      "Consultas e atendimento direto pelo WhatsApp, sem precisar baixar nenhum aplicativo separado.",
    icon: MessageCircle,
  },
  {
    title: "Portal Exclusivo",
    description:
      "Cada paciente, profissional e clínica com seu portal próprio, seguro e personalizado.",
    icon: Building2,
  },
  {
    title: "ProntAI",
    description:
      "Inteligência artificial que faz triagem 24h, interpreta exames e organiza o histórico de saúde.",
    icon: Brain,
  },
  {
    title: "IA Hospitalar",
    description:
      "ERP com IA preditiva, gestão de leitos, escalas e previsão de deterioração clínica.",
    icon: Activity,
  },
];

// "Por que escolher a Pront"
export const reasons: Feature[] = [
  {
    title: "Receitas digitais válidas",
    description:
      "Prescrições com assinatura digital reconhecidas em todo o Brasil, enviadas direto ao paciente.",
    icon: FileText,
  },
  {
    title: "Agenda inteligente",
    description:
      "Agendamento integrado com confirmação automática por WhatsApp e lembretes para reduzir faltas.",
    icon: CalendarCheck,
  },
  {
    title: "IA 24 horas",
    description:
      "Triagem clínica e suporte ao paciente a qualquer hora, com mais de 766 protocolos clínicos.",
    icon: Brain,
  },
  {
    title: "Segurança e LGPD",
    description:
      "Criptografia ponta a ponta e total conformidade com a LGPD para proteger os dados de saúde.",
    icon: ShieldCheck,
  },
  {
    title: "Telemedicina completa",
    description:
      "Consultas por vídeo e chat com médicos e dentistas, com prontuário eletrônico integrado.",
    icon: Stethoscope,
  },
  {
    title: "Base clínica robusta",
    description:
      "Mais de 929 medicamentos e 766 protocolos clínicos para apoiar a decisão do profissional.",
    icon: Activity,
  },
];

export const stats = [
  { value: "766+", label: "Protocolos clínicos" },
  { value: "929+", label: "Medicamentos na base" },
  { value: "24h", label: "Triagem com IA" },
  { value: "100%", label: "Receitas válidas no Brasil" },
];
