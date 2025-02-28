import { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import {
  ChannelTypeEnum,
  IConfigCredentials,
  ILogoFileName,
  providers,
  PushProviderIdEnum,
  EmailProviderIdEnum,
  InAppProviderIdEnum,
  ProvidersIdEnum,
} from '@novu/shared';
import { Modal } from '@mantine/core';
import * as cloneDeep from 'lodash.clonedeep';
import PageMeta from '../../components/layout/components/PageMeta';
import PageHeader from '../../components/layout/components/PageHeader';
import PageContainer from '../../components/layout/components/PageContainer';
import { ChannelGroup } from './components/ChannelGroup';
import { ConnectIntegrationForm } from './components/ConnectIntegrationForm';
import { useIntegrations } from '../../hooks';
import { When } from '../../components/utils/When';
import { NovuEmailProviderModal } from './components/NovuEmailProviderModal';
import { NovuInAppProviderModal } from './components/NovuInAppProviderModal';

export function IntegrationsStore() {
  const { integrations, loading: isLoading, refetch } = useIntegrations();
  const [emailProviders, setEmailProviders] = useState<IIntegratedProvider[]>([]);
  const [smsProvider, setSmsProvider] = useState<IIntegratedProvider[]>([]);
  const [chatProvider, setChatProvider] = useState<IIntegratedProvider[]>([]);
  const [pushProvider, setPushProvider] = useState<IIntegratedProvider[]>([]);
  const [isModalOpened, setModalIsOpened] = useState(false);
  const [isCreateIntegrationModal, setIsCreateIntegrationModal] = useState(false);
  const [provider, setProvider] = useState<IIntegratedProvider | null>(null);

  async function handlerVisible(
    visible: boolean,
    createIntegrationModal: boolean,
    providerConfig: IIntegratedProvider
  ) {
    setModalIsOpened(visible);
    setProvider(providerConfig);
    setIsCreateIntegrationModal(createIntegrationModal);
  }

  async function handlerShowModal(showModal: boolean) {
    await setModalIsOpened(showModal);
    if (!showModal) {
      await refetch();
    }
  }

  useEffect(() => {
    if (integrations) {
      const initializedProviders = initializeProviders(integrations);

      setEmailProviders(
        sortProviders(initializedProviders.filter((providerItem) => providerItem.channel === ChannelTypeEnum.EMAIL))
      );
      setSmsProvider(
        sortProviders(initializedProviders.filter((providerItem) => providerItem.channel === ChannelTypeEnum.SMS))
      );

      setChatProvider(
        sortProviders(initializedProviders.filter((providerItem) => providerItem.channel === ChannelTypeEnum.CHAT))
      );

      setPushProvider(
        sortProviders(initializedProviders.filter((providerItem) => providerItem.channel === ChannelTypeEnum.PUSH))
      );
    }
  }, [integrations]);

  return (
    <>
      <PageMeta title="Integrations" />
      {!isLoading ? (
        <PageContainer>
          <PageHeader title="Integration Store" />

          <Modal
            withCloseButton={false}
            centered
            size="lg"
            overflow="inside"
            opened={isModalOpened}
            onClose={() => setModalIsOpened(false)}
          >
            <When truthy={!provider?.novu}>
              <ConnectIntegrationForm
                onClose={() => setModalIsOpened(false)}
                provider={provider}
                showModal={handlerShowModal}
                createModel={isCreateIntegrationModal}
              />
            </When>
            <When truthy={provider?.providerId === EmailProviderIdEnum.Novu}>
              <NovuEmailProviderModal onClose={() => setModalIsOpened(false)} />
            </When>
            <When truthy={provider?.providerId === InAppProviderIdEnum.Novu}>
              <NovuInAppProviderModal onClose={() => setModalIsOpened(false)} />
            </When>
          </Modal>

          <ContentWrapper>
            <ChannelGroup
              channel={ChannelTypeEnum.EMAIL}
              providers={emailProviders}
              title="Email"
              onProviderClick={handlerVisible}
            />
            <ChannelGroup
              channel={ChannelTypeEnum.SMS}
              providers={smsProvider}
              title="SMS"
              onProviderClick={handlerVisible}
            />
            <ChannelGroup
              channel={ChannelTypeEnum.CHAT}
              providers={chatProvider}
              title="Chat"
              onProviderClick={handlerVisible}
            />
            <ChannelGroup
              channel={ChannelTypeEnum.PUSH}
              providers={pushProvider}
              title="Push"
              onProviderClick={handlerVisible}
            />
          </ContentWrapper>
        </PageContainer>
      ) : null}
    </>
  );
}

const ContentWrapper = styled.div`
  padding: 0 30px;
`;

const sortProviders = (unsortedProviders: IIntegratedProvider[]) => {
  return unsortedProviders
    .sort((a, b) => Number(b.active) - Number(a.active))
    .sort((a, b) => Number(isConnected(b)) - Number(isConnected(a)));
};

function isConnected(provider: IIntegratedProvider) {
  if (!provider.credentials.length) return false;

  return provider.credentials?.some((cred) => {
    return cred.value;
  });
}

export interface IIntegratedProvider {
  providerId: ProvidersIdEnum;
  integrationId: string;
  displayName: string;
  channel: ChannelTypeEnum;
  credentials: IConfigCredentials[];
  docReference: string;
  comingSoon: boolean;
  active: boolean;
  connected: boolean;
  logoFileName: ILogoFileName;
  betaVersion: boolean;
  novu?: boolean;
}

export interface ICredentials {
  apiKey?: string;
  user?: string;
  secretKey?: string;
  domain?: string;
  password?: string;
  host?: string;
  port?: string;
  secure?: boolean;
  region?: string;
  accountSid?: string;
  messageProfileId?: string;
  token?: string;
  from?: string;
  senderName?: string;
  applicationId?: string;
  clientId?: string;
  projectName?: string;
  serviceAccount?: string;
  baseUrl?: string;
  webhookUrl?: string;
  requireTls?: boolean;
  ignoreTls?: boolean;
  tlsOptions?: Record<string, unknown>;
  redirectUrl?: string;
  hmac?: boolean;
}

export interface IntegrationEntity {
  _id?: string;

  _environmentId: string;

  _organizationId: string;

  providerId: ProvidersIdEnum;

  channel: ChannelTypeEnum;

  credentials: ICredentials;

  active: boolean;

  deleted: boolean;

  deletedAt: string;

  deletedBy: string;
}

function initializeProviders(integrations: IntegrationEntity[]): IIntegratedProvider[] {
  return providers.map((providerItem) => {
    const integration = integrations.find((integrationItem) => integrationItem.providerId === providerItem.id);

    const clonedCredentials = cloneDeep(providerItem.credentials);

    if (integration?.credentials && Object.keys(clonedCredentials).length !== 0) {
      clonedCredentials.forEach((credential) => {
        // eslint-disable-next-line no-param-reassign
        if (credential.type === 'object' && integration.credentials[credential.key]) {
          credential.value = JSON.stringify(integration.credentials[credential.key]);
        } else if (credential.type === 'switch') {
          credential.value = integration.credentials[credential.key];
        } else {
          credential.value = integration.credentials[credential.key]?.toString();
        }
      });
    }

    // Remove this like after the run of the fcm-credentials-migration script
    fcmFallback(integration, clonedCredentials);

    return {
      providerId: providerItem.id,
      integrationId: integration?._id ? integration._id : '',
      displayName: providerItem.displayName,
      channel: providerItem.channel,
      credentials: integration?.credentials ? clonedCredentials : providerItem.credentials,
      docReference: providerItem.docReference,
      comingSoon: !!providerItem.comingSoon,
      betaVersion: !!providerItem.betaVersion,
      active: integration?.active ?? false,
      connected: !!integration,
      logoFileName: providerItem.logoFileName,
    };
  });
}

/*
 * temporary patch before migration script
 */
function fcmFallback(integration: IntegrationEntity | undefined, clonedCredentials) {
  if (integration?.providerId === PushProviderIdEnum.FCM) {
    const serviceAccount = integration?.credentials.serviceAccount
      ? integration?.credentials.serviceAccount
      : integration?.credentials.user;

    clonedCredentials?.forEach((cred) => {
      if (cred.key === 'serviceAccount') {
        cred.value = serviceAccount;
      }
    });
  }
}
