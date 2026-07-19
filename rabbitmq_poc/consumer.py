import pika
import time
import sys

def main():
    credentials = pika.PlainCredentials('cadence', 'cadence_dev_pw')
    parameters = pika.ConnectionParameters(host='localhost', port=5672, credentials=credentials)
    
    try:
        connection = pika.BlockingConnection(parameters)
        channel = connection.channel()
        
        # Declare queues
        channel.queue_declare(queue='poc.ping', durable=True)
        channel.queue_declare(queue='poc.pong', durable=True)
        
        print(" [*] Connected to RabbitMQ. Waiting for messages in poc.ping. To exit press CTRL+C")
        
        def callback(ch, method, properties, body):
            message = body.decode('utf-8')
            print(f" [x] Received '{message}'")
            
            # Simulate work
            time.sleep(1)
            
            # Reply message
            reply = f"PONG: received '{message}' and processed it"
            
            # Publish to poc.pong
            ch.basic_publish(
                exchange='',
                routing_key='poc.pong',
                body=reply
            )
            print(f" [x] Sent '{reply}'")
            ch.basic_ack(delivery_tag=method.delivery_tag)
            
        channel.basic_qos(prefetch_count=1)
        channel.basic_consume(queue='poc.ping', on_message_callback=callback)
        channel.start_consuming()
        
    except pika.exceptions.AMQPConnectionError as e:
        print(f" [!] Connection failed: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print(" [*] Stopping consumer...")
        try:
            connection.close()
        except:
            pass

if __name__ == '__main__':
    main()
