import { Editor } from '@tinymce/tinymce-react';

const RichTextEditor = ({ content, onChange }) => {
  return (
    <Editor
      apiKey="your-tiny-api-key" // Get a free API key from https://www.tiny.cloud/
      init={{
        height: '100%',
        menubar: true,
        plugins: [
          'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
          'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
          'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount',
          'codesample'
        ],
        toolbar: 'undo redo | blocks | ' +
          'bold italic forecolor | alignleft aligncenter ' +
          'alignright alignjustify | bullist numlist outdent indent | ' +
          'removeformat | codesample | help',
        content_style: `
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            font-size: 16px;
            color: #e2e8f0;
            background: #0f172a;
          }
          code {
            background-color: #1e293b;
            padding: 2px 4px;
            border-radius: 4px;
          }
        `,
        skin: 'oxide-dark',
        content_css: 'dark',
      }}
      value={content}
      onEditorChange={onChange}
    />
  );
};

export default RichTextEditor;
