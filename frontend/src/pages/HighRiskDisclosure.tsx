import { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Image,
  Input,
  List,
  Modal,
  Select,
  Space,
  Table,
  Timeline,
  Typography,
  Upload,
  message,
} from 'antd';
import { UploadOutlined, UserOutlined } from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { highRiskDisclosureApi } from '../api/highRiskDisclosure';
import { StatusBadge } from '../components/common/StatusBadge';
import { UserAvatar } from '../components/common/UserAvatar';
import { useHighRiskDisclosureStore } from '../stores/highRiskDisclosureStore';
import { DisclosureStatus, HighRiskWorkType } from '../types/enums';
import type { HighRiskDisclosure } from '../types';
import { canCloseDisclosure } from '../types/roles';
import { useAuthStore } from '../stores/authStore';
import { usePagination } from '../hooks/usePagination';

const workTypeLabels: Record<HighRiskWorkType, string> = {
  [HighRiskWorkType.HighAltitude]: '高空作业',
  [HighRiskWorkType.DeepExcavation]: '深基坑作业',
  [HighRiskWorkType.Lifting]: '起重作业',
  [HighRiskWorkType.Scaffolding]: '脚手架作业',
  [HighRiskWorkType.ElectricWork]: '临电作业',
  [HighRiskWorkType.HotWork]: '动火作业',
  [HighRiskWorkType.ConfinedSpace]: '受限空间',
  [HighRiskWorkType.Other]: '其他',
};

export function HighRiskDisclosureManage() {
  const [form] = Form.useForm();
  const [filterForm] = Form.useForm();
  const [signForm] = Form.useForm();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState<HighRiskDisclosure>();
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [signingId, setSigningId] = useState<number>();
  const { disclosures, loading, total, loadDisclosures, createDisclosure } = useHighRiskDisclosureStore();
  const pagination = usePagination(8);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    loadDisclosures({ page: pagination.page, pageSize: pagination.pageSize });
  }, [loadDisclosures, pagination.page, pagination.pageSize]);

  const columns: ColumnsType<HighRiskDisclosure> = useMemo(
    () => [
      {
        title: '交底标题',
        dataIndex: 'title',
        render: (text, record) => <Button type="link" onClick={() => setDetail(record)}>{text}</Button>,
      },
      { title: '作业类型', dataIndex: 'workType', render: (type) => workTypeLabels[type] },
      { title: '位置', render: (_, record) => `${record.site} / ${record.area}` },
      { title: '签字人数', render: (_, record) => `${record.signers.length} 人` },
      { title: '状态', dataIndex: 'status', render: (status) => <StatusBadge status={status} /> },
      { title: '计划时间', dataIndex: 'scheduledAt', render: (value) => dayjs(value).format('YYYY-MM-DD HH:mm') },
      {
        title: '操作',
        render: (_, record) => (
          <Space>
            <Button size="small" onClick={() => { setSigningId(record.id); setSignModalOpen(true); }}>
              签字
            </Button>
            {canCloseDisclosure(user.role) && record.status !== DisclosureStatus.Closed && (
              <Button size="small" onClick={() => highRiskDisclosureApi.close(record.id, '作业完成').then(() => loadDisclosures())}>
                关闭
              </Button>
            )}
          </Space>
        ),
      },
    ],
    [loadDisclosures, user.role],
  );

  async function submitDisclosure(values: Record<string, unknown>) {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (key === 'photos') return;
      if (key === 'scheduledAt') formData.append(key, dayjs(value as string).toISOString());
      else if (Array.isArray(value)) formData.append(key, JSON.stringify(value));
      else if (value !== undefined && value !== null) formData.append(key, String(value));
    });
    const photoValue = values.photos as Array<{ originFileObj?: File }> | { fileList?: Array<{ originFileObj?: File }> } | undefined;
    const files = Array.isArray(photoValue) ? photoValue : photoValue?.fileList ?? [];
    files.forEach((file) => {
      if (file.originFileObj) formData.append('photos', file.originFileObj);
    });
    await createDisclosure(formData);
    message.success('交底单已创建');
    setDrawerOpen(false);
    form.resetFields();
  }

  async function handleSign(values: { name: string; role: string }) {
    if (!signingId) return;
    await highRiskDisclosureApi.sign(signingId, values.name, values.role);
    message.success('签字成功');
    setSignModalOpen(false);
    signForm.resetFields();
    setSigningId(undefined);
    loadDisclosures();
  }

  return (
    <Space direction="vertical" size={16} className="page">
      <div className="page-header">
        <div>
          <Typography.Title level={2}>高危作业交底</Typography.Title>
          <Typography.Text type="secondary">作业内容、风险点告知，签字确认留痕</Typography.Text>
        </div>
        <Button type="primary" onClick={() => setDrawerOpen(true)}>新增交底单</Button>
      </div>

      <Form
        form={filterForm}
        layout="inline"
        className="filter-bar"
        onFinish={(values) => loadDisclosures({ ...values, page: 1, pageSize: pagination.pageSize })}
      >
        <Form.Item name="workType" label="作业类型">
          <Select
            allowClear
            style={{ width: 160 }}
            options={Object.values(HighRiskWorkType).map((value) => ({ value, label: workTypeLabels[value] }))}
          />
        </Form.Item>
        <Form.Item name="status" label="状态">
          <Select
            allowClear
            style={{ width: 140 }}
            options={Object.values(DisclosureStatus).map((value) => ({ value, label: value }))}
          />
        </Form.Item>
        <Button htmlType="submit">筛选</Button>
      </Form>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={disclosures}
        pagination={{ ...pagination.tablePagination, total }}
      />

      <Drawer title="创建交底单" width={560} open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Form form={form} layout="vertical" onFinish={submitDisclosure} initialValues={{ workType: HighRiskWorkType.Other }}>
          <Form.Item name="title" label="交底标题" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="workType" label="作业类型" rules={[{ required: true }]}>
            <Select
              options={Object.values(HighRiskWorkType).map((value) => ({ value, label: workTypeLabels[value] }))}
            />
          </Form.Item>
          <Form.Item name="workContent" label="作业内容" rules={[{ required: true }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="riskPoints" label="风险点" rules={[{ required: true }]}>
            <Input.TextArea rows={4} placeholder="逐条列出作业过程中可能存在的安全风险点" />
          </Form.Item>
          <Form.Item name="safetyMeasures" label="安全措施">
            <Input.TextArea rows={3} placeholder="针对风险点的防护措施" />
          </Form.Item>
          <Form.Item name="scheduledAt" label="计划作业时间" rules={[{ required: true }]}>
            <DatePicker showTime className="full" />
          </Form.Item>
          <Space className="full" align="start">
            <Form.Item name="site" label="工地" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="area" label="区域" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Space>
          <Form.Item
            name="signers"
            label="交底签字人"
            tooltip="填写参与交底并需要签字的人员"
          >
            <Select
              mode="tags"
              placeholder="输入后回车添加"
              tokenSeparators={[',']}
              style={{ width: '100%' }}
              options={[
                { value: JSON.stringify({ name: '张三', role: '施工负责人' }), label: '张三（施工负责人）' },
                { value: JSON.stringify({ name: '李四', role: '安全员' }), label: '李四（安全员）' },
              ]}
              optionLabelProp="label"
            />
          </Form.Item>
          <Form.Item name="photos" label="现场照片" valuePropName="fileList" getValueFromEvent={(event) => event?.fileList ?? []}>
            <Upload beforeUpload={() => false} listType="picture">
              <Button icon={<UploadOutlined />}>选择照片</Button>
            </Upload>
          </Form.Item>
          <Button type="primary" htmlType="submit">提交交底单</Button>
        </Form>
      </Drawer>

      <Drawer title="交底详情" width={600} open={Boolean(detail)} onClose={() => setDetail(undefined)}>
        {detail && (
          <Space direction="vertical" size={16} className="full">
            <Typography.Title level={4}>{detail.title}</Typography.Title>
            <Space>
              <StatusBadge status={detail.status} />
              <Typography.Text type="secondary">{workTypeLabels[detail.workType]}</Typography.Text>
            </Space>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="作业内容">{detail.workContent}</Descriptions.Item>
              <Descriptions.Item label="风险点">{detail.riskPoints}</Descriptions.Item>
              <Descriptions.Item label="安全措施">{detail.safetyMeasures || '-'}</Descriptions.Item>
              <Descriptions.Item label="位置">{detail.site} / {detail.area}</Descriptions.Item>
              <Descriptions.Item label="计划时间">{dayjs(detail.scheduledAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
            </Descriptions>
            <div>
              <Typography.Title level={5}>签字人</Typography.Title>
              {detail.signers.length > 0 ? (
                <List
                  dataSource={detail.signers}
                  renderItem={(signer) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<Avatar icon={<UserOutlined />} />}
                        title={signer.name}
                        description={`${signer.role}${signer.signedAt ? ` · ${dayjs(signer.signedAt).format('MM-DD HH:mm')}` : ' · 待签字'}`}
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <Typography.Text type="secondary">暂无签字人</Typography.Text>
              )}
            </div>
            <div>
              <Typography.Title level={5}>现场照片</Typography.Title>
              {detail.photoUrls.length > 0 ? (
                <Image.PreviewGroup>
                  <Space wrap>
                    {detail.photoUrls.map((url, index) => (
                      <Image
                        key={index}
                        width={100}
                        height={100}
                        src={url}
                        style={{ objectFit: 'cover' }}
                      />
                    ))}
                  </Space>
                </Image.PreviewGroup>
              ) : (
                <Typography.Text type="secondary">暂无照片</Typography.Text>
              )}
            </div>
            <UserAvatar userId={detail.createdById} />
            <Timeline items={(detail.timeline ?? []).map((item) => ({ children: `${dayjs(item.at).format('MM-DD HH:mm')} ${item.label}${item.note ? `：${item.note}` : ''}` }))} />
          </Space>
        )}
      </Drawer>

      <Modal
        title="签字确认"
        open={signModalOpen}
        onCancel={() => { setSignModalOpen(false); signForm.resetFields(); setSigningId(undefined); }}
        onOk={() => signForm.submit()}
        okText="确认签字"
      >
        <Form form={signForm} layout="vertical" onFinish={handleSign}>
          <Form.Item name="name" label="签字人姓名" rules={[{ required: true }]}>
            <Input placeholder="请输入您的姓名" />
          </Form.Item>
          <Form.Item name="role" label="岗位/角色" rules={[{ required: true }]}>
            <Select
              options={[
                { value: '施工负责人', label: '施工负责人' },
                { value: '安全员', label: '安全员' },
                { value: '作业人员', label: '作业人员' },
                { value: '其他', label: '其他' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
