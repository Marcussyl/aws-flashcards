import type { TopicId } from '@/data/topics'

export type CategoryMeta = {
  topic: TopicId
  name: string
  emoji: string
  blurb: string
}

export function getCategoryEmoji(name: string, topic?: TopicId) {
  return (
    CATEGORIES.find(
      (item) => item.name === name && (!topic || item.topic === topic),
    )?.emoji ?? '⚡'
  )
}

export function getCategoriesForTopic(topic: TopicId) {
  return CATEGORIES.filter((item) => item.topic === topic)
}

export const CATEGORIES: CategoryMeta[] = [
  {
    topic: 'aws',
    name: 'Exam & Architecture',
    emoji: '📐',
    blurb: 'SAA exam domains, Well-Architected, RPO/RTO, Trusted Advisor',
  },
  {
    topic: 'aws',
    name: 'IAM & Federation',
    emoji: '🔐',
    blurb: 'IAM, STS, SSO, SAML/OIDC, Directory Service, Cognito',
  },
  {
    topic: 'aws',
    name: 'Networking & Hybrid',
    emoji: '🌐',
    blurb: 'VPC, endpoints, DX, VPN, TGW, SG/NACL, ENI/ENA/EFA',
  },
  {
    topic: 'aws',
    name: 'Compute & Scaling',
    emoji: '🖥️',
    blurb: 'EC2, ASG, Lambda, AMI, placement groups, SSM',
  },
  {
    topic: 'aws',
    name: 'Storage & Transfer',
    emoji: '📦',
    blurb: 'S3, EBS, EFS, FSx, Glacier, DataSync, Storage Gateway',
  },
  {
    topic: 'aws',
    name: 'Databases',
    emoji: '🗄️',
    blurb: 'RDS, Aurora, DynamoDB, DMS, replicas, Multi-AZ',
  },
  {
    topic: 'aws',
    name: 'CDN, DNS & Load Balancing',
    emoji: '🚦',
    blurb: 'CloudFront, Route 53, ALB/NLB/GWLB, signed URLs',
  },
  {
    topic: 'aws',
    name: 'Security & Encryption',
    emoji: '🛡️',
    blurb: 'WAF, Shield, GuardDuty, Macie, KMS, Object Lock',
  },
  {
    topic: 'aws',
    name: 'Integration & Messaging',
    emoji: '📨',
    blurb: 'SQS, SNS, EventBridge, Step Functions, SWF, Kinesis',
  },
  {
    topic: 'aws',
    name: 'Containers & Kubernetes',
    emoji: '🐳',
    blurb: 'ECS, EKS, Fargate, IRSA, HPA/VPA, task roles',
  },
  {
    topic: 'aws',
    name: 'Analytics & AI',
    emoji: '📊',
    blurb: 'Glue, Athena, EMR, Spark, Bedrock, SageMaker',
  },
  {
    topic: 'aws',
    name: 'Monitoring & Operations',
    emoji: '📈',
    blurb: 'CloudWatch, CloudTrail, Enhanced Monitoring, SAM',
  },
  {
    topic: 'aws',
    name: 'Cost, Governance & Multi-Account',
    emoji: '🏛️',
    blurb: 'Organizations, Control Tower, SCP, RAM, Cost Explorer',
  },
  {
    topic: 'aws',
    name: 'Migration & DR',
    emoji: '🚚',
    blurb: 'MGN, DMS, DRS, Discovery, Migration Hub',
  },
  {
    topic: 'pve',
    name: 'Containers (LXC)',
    emoji: '📦',
    blurb: 'Unprivileged vs privileged, UID mapping, nesting, bind mounts',
  },
  {
    topic: 'pve',
    name: 'Virtual Machines',
    emoji: '💻',
    blurb: 'QEMU/KVM, when a VM beats LXC',
  },
  {
    topic: 'pve',
    name: 'Networking',
    emoji: '🌐',
    blurb: 'Linux bridge, vmbr, guest NICs',
  },
]
