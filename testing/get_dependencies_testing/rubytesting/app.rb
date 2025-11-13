require 'sinatra'

class App < Sinatra::Base
  get '/' do
    { message: 'Hello from Sinatra!', timestamp: Time.now.iso8601 }.to_json
  end

  get '/api/users' do
    [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
    ].to_json
  end

  error do
    status 500
    { error: 'Something went wrong!' }.to_json
  end
end

