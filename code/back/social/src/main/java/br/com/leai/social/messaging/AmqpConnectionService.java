package br.com.leai.social.messaging;

import com.rabbitmq.client.BuiltinExchangeType;
import com.rabbitmq.client.Channel;
import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.connection.Connection;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.context.SmartLifecycle;

/** Owns one broker connection and the separate publisher and consumer channels. */
public final class AmqpConnectionService implements SmartLifecycle {

  private static final long RECONNECT_DELAY_SECONDS = 5;
  private final Logger logger = LoggerFactory.getLogger(AmqpConnectionService.class);
  private final MessagingProperties properties;
  private final ConnectionFactory connectionFactory;
  private final ScheduledExecutorService reconnectExecutor =
      Executors.newSingleThreadScheduledExecutor(
          runnable -> {
            Thread thread = new Thread(runnable, "social-amqp-reconnect");
            thread.setDaemon(true);
            return thread;
          });
  private final List<Consumer<Channel>> publisherReady = new CopyOnWriteArrayList<>();
  private final List<Consumer<Channel>> consumerReady = new CopyOnWriteArrayList<>();
  private final AtomicBoolean connecting = new AtomicBoolean();
  private volatile Connection connection;
  private volatile Channel publisherChannel;
  private volatile Channel consumerChannel;
  private volatile boolean running;
  private volatile boolean stopping;

  public AmqpConnectionService(MessagingProperties properties, ConnectionFactory connectionFactory) {
    this.properties = properties;
    this.connectionFactory = connectionFactory;
  }

  public boolean isEnabled() {
    return properties.amqpEnabled();
  }

  public boolean isReady() {
    Connection current = connection;
    return isEnabled()
        && current != null
        && current.isOpen()
        && publisherChannel != null
        && publisherChannel.isOpen()
        && consumerChannel != null
        && consumerChannel.isOpen();
  }

  public Channel publisherChannel() {
    Channel channel = publisherChannel;
    if (!isReady() || channel == null) {
      throw new IllegalStateException("Canal AMQP de publicacao indisponivel");
    }
    return channel;
  }

  public Channel consumerChannel() {
    Channel channel = consumerChannel;
    if (!isReady() || channel == null) {
      throw new IllegalStateException("Canal AMQP de consumo indisponivel");
    }
    return channel;
  }

  public void onPublisherReady(Consumer<Channel> listener) {
    publisherReady.add(listener);
    Channel channel = publisherChannel;
    if (isReady() && channel != null) {
      listener.accept(channel);
    }
  }

  public void onConsumerReady(Consumer<Channel> listener) {
    consumerReady.add(listener);
    Channel channel = consumerChannel;
    if (isReady() && channel != null) {
      listener.accept(channel);
    }
  }

  @Override
  public void start() {
    if (!isEnabled() || stopping || running) {
      return;
    }
    running = true;
    scheduleConnect(0);
  }

  @Override
  public void stop() {
    stopping = true;
    running = false;
    reconnectExecutor.shutdownNow();
    closeQuietly(connection);
    publisherChannel = null;
    consumerChannel = null;
    connection = null;
  }

  @Override
  public boolean isRunning() {
    return running;
  }

  @Override
  public int getPhase() {
    return Integer.MIN_VALUE;
  }

  private void connect() {
    if (!isEnabled() || stopping || connectionFactory == null || !connecting.compareAndSet(false, true)) {
      return;
    }
    try {
      Connection newConnection = connectionFactory.createConnection();
      Channel newPublisher = newConnection.createChannel(false);
      newPublisher.confirmSelect();
      Channel newConsumer = newConnection.createChannel(false);
      declareTopology(newPublisher);
      newConnection.getDelegate().addShutdownListener(cause -> disconnected(newConnection));
      connection = newConnection;
      publisherChannel = newPublisher;
      consumerChannel = newConsumer;
      publisherReady.forEach(listener -> listener.accept(newPublisher));
      consumerReady.forEach(listener -> listener.accept(newConsumer));
      logger.info("AMQP conectado; exchanges P0 declarados");
    } catch (Exception exception) {
      logger.warn("Nao foi possivel conectar ao RabbitMQ: {}", exception.getMessage());
      scheduleConnect(RECONNECT_DELAY_SECONDS);
    } finally {
      connecting.set(false);
    }
  }

  private void declareTopology(Channel channel) throws IOException {
    for (String exchange : MessagingConstants.DOMAIN_EXCHANGES) {
      channel.exchangeDeclare(exchange, BuiltinExchangeType.TOPIC, true, false, null);
    }
    channel.exchangeDeclare(
        MessagingConstants.DEAD_LETTER_EXCHANGE, BuiltinExchangeType.DIRECT, true, false, null);
  }

  private void disconnected(Connection disconnected) {
    if (connection == disconnected && !stopping) {
      publisherChannel = null;
      consumerChannel = null;
      connection = null;
      scheduleConnect(RECONNECT_DELAY_SECONDS);
    }
  }

  private void scheduleConnect(long delaySeconds) {
    if (stopping || reconnectExecutor.isShutdown()) {
      return;
    }
    reconnectExecutor.schedule(this::connect, delaySeconds, TimeUnit.SECONDS);
  }

  private void closeQuietly(Connection current) {
    if (current != null) {
      try {
        current.close();
      } catch (Exception ignored) {
        // Shutdown must not prevent the application from closing.
      }
    }
  }
}
