export type CategoryMeta = {
  name: string
  emoji: string
  blurb: string
}

export function getCategoryEmoji(name: string) {
  return CATEGORIES.find((item) => item.name === name)?.emoji ?? '⚡'
}

export const CATEGORIES: CategoryMeta[] = [
  {
    name: 'Exam & Architecture',
    emoji: '📐',
    blurb: 'SAA exam domains, Well-Architected, RPO/RTO, Trusted Advisor',
  },
  {
    name: 'IAM & Federation',
    emoji: '🔐',
    blurb: 'IAM, STS, SSO, SAML/OIDC, Directory Service, Cognito',
  },
  {
    name: 'Networking & Hybrid',
    emoji: '🌐',
    blurb: 'VPC, endpoints, DX, VPN, TGW, SG/NACL, ENI/ENA/EFA',
  },
  {
    name: 'Compute & Scaling',
    emoji: '🖥️',
    blurb: 'EC2, ASG, Lambda, AMI, placement groups, SSM',
  },
  {
    name: 'Storage & Transfer',
    emoji: '📦',
    blurb: 'S3, EBS, EFS, FSx, Glacier, DataSync, Storage Gateway',
  },
  {
    name: 'Databases',
    emoji: '🗄️',
    blurb: 'RDS, Aurora, DynamoDB, DMS, replicas, Multi-AZ',
  },
  {
    name: 'CDN, DNS & Load Balancing',
    emoji: '🚦',
    blurb: 'CloudFront, Route 53, ALB/NLB/GWLB, signed URLs',
  },
  {
    name: 'Security & Encryption',
    emoji: '🛡️',
    blurb: 'WAF, Shield, GuardDuty, Macie, KMS, Object Lock',
  },
  {
    name: 'Integration & Messaging',
    emoji: '📨',
    blurb: 'SQS, SNS, EventBridge, Step Functions, SWF, Kinesis',
  },
  {
    name: 'Containers & Kubernetes',
    emoji: '🐳',
    blurb: 'ECS, EKS, Fargate, IRSA, HPA/VPA, task roles',
  },
  {
    name: 'Analytics & AI',
    emoji: '📊',
    blurb: 'Glue, Athena, EMR, Spark, Bedrock, SageMaker',
  },
  {
    name: 'Monitoring & Operations',
    emoji: '📈',
    blurb: 'CloudWatch, CloudTrail, Enhanced Monitoring, SAM',
  },
  {
    name: 'Cost, Governance & Multi-Account',
    emoji: '🏛️',
    blurb: 'Organizations, Control Tower, SCP, RAM, Cost Explorer',
  },
  {
    name: 'Migration & DR',
    emoji: '🚚',
    blurb: 'MGN, DMS, DRS, Discovery, Migration Hub',
  },
]
