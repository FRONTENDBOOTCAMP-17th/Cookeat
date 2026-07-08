'use client';

import {
  useEditor,
  EditorContent,
  ReactNodeViewRenderer,
  NodeViewWrapper,
  type NodeViewProps,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading2,
  Heading3,
  Quote,
  Minus,
  Link2,
  Undo2,
  Redo2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  ImageIcon,
} from 'lucide-react';
import { DescriptionEditorProps } from '@/types/seller/product';

function ResizableImageView({ node, updateAttributes, selected }: NodeViewProps) {
  const widthPercent = (node.attrs.width as string) || '100%';
  const align = (node.attrs.align as string) || 'center';

  const sizeOptions = [
    { label: '작게', value: '25%' },
    { label: '보통', value: '50%' },
    { label: '크게', value: '75%' },
    { label: '원본', value: '100%' },
  ];

  const alignOptions: { label: string; value: string; icon: React.ReactNode }[] = [
    { label: '왼쪽', value: 'left', icon: <AlignLeft size={12} /> },
    { label: '가운데', value: 'center', icon: <AlignCenter size={12} /> },
    { label: '오른쪽', value: 'right', icon: <AlignRight size={12} /> },
  ];

  const marginStyle =
    align === 'center'
      ? { marginLeft: 'auto', marginRight: 'auto' }
      : align === 'right'
        ? { marginLeft: 'auto', marginRight: '0' }
        : { marginLeft: '0', marginRight: 'auto' };
  return (
    <NodeViewWrapper className="relative my-2" style={{ width: widthPercent, ...marginStyle }}>
      {selected && (
        <div
          contentEditable={false}
          className="absolute -top-8 left-0 flex gap-1 bg-white border border-gray-200 rounded-md shadow-sm px-1 py-0.5 z-10"
        >
          {sizeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateAttributes({ width: opt.value })}
              className={`text-xs px-1.5 py-0.5 rounded ${
                widthPercent === opt.value
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {opt.label}
            </button>
          ))}

          <div className="w-px bg-gray-200 mx-0.5" />

          {alignOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              title={opt.label}
              onClick={() => updateAttributes({ align: opt.value })}
              className={`flex items-center justify-center w-6 h-6 rounded ${
                align === opt.value ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {opt.icon}
            </button>
          ))}
        </div>
      )}
      {/* Tiptap 노드뷰: 폭이 %로 동적 조절되고 blob: 미리보기도 올 수 있어 next/image로 옮기지 않음 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={node.attrs.src}
        alt={node.attrs.alt || ''}
        className={`block w-full h-auto rounded ${selected ? 'ring-2 ring-blue-400' : ''}`}
      />
    </NodeViewWrapper>
  );
}

const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: '50%',
        parseHTML: (element) => element.style.width || '50%',
        renderHTML: (attributes) => ({ style: `width: ${attributes.width || '50%'}` }),
      },
      align: {
        default: 'center',
        parseHTML: (element) => {
          if (element.style.marginLeft === '0px') return 'left';
          if (element.style.marginRight === '0px') return 'right';
          return 'center';
        },
        renderHTML: (attributes) => {
          const align = attributes.align || 'center';
          const margin =
            align === 'center'
              ? 'margin-left: auto; margin-right: auto;'
              : align === 'right'
                ? 'margin-left: auto; margin-right: 0;'
                : 'margin-left: 0; margin-right: auto;';
          return { style: `width: ${attributes.width || '50%'}; ${margin}` };
        },
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});

export default function DescriptionEditor({ data, onChange }: DescriptionEditorProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const handleImageButtonClick = () => imageInputRef.current?.click();

  const [activeFontSize, setActiveFontSize] = useState('');
  const [activeColor, setActiveColor] = useState('#000000');
  const [activeHighlight, setActiveHighlight] = useState('#ffff00');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      ResizableImage.configure({ inline: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle.extend({
        inclusive: false,
        addAttributes() {
          return {
            ...this.parent?.(),
            fontSize: {
              default: null,
              parseHTML: (element) => element.style.fontSize || null,
              renderHTML: (attributes) => {
                if (!attributes.fontSize) return {};
                return { style: `font-size: ${attributes.fontSize}` };
              },
            },
          };
        },
      }),
      Color.configure({ types: ['textStyle'] }),
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false, autolink: false }),
    ],
    content: data.content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'min-h-[280px] px-4 py-3 text-sm text-gray-800 focus:outline-none prose prose-sm max-w-none',
      },
    },
  });

  useEffect(() => {
    if (!editor) return;

    const syncToolbarState = () => {
      const attrs = editor.getAttributes('textStyle');
      setActiveFontSize((attrs.fontSize as string) ?? '');
      setActiveColor((attrs.color as string) ?? '#000000');
      const highlightAttrs = editor.getAttributes('highlight');
      setActiveHighlight((highlightAttrs.color as string) ?? '#ffff00');
    };

    editor.on('selectionUpdate', syncToolbarState);
    editor.on('transaction', syncToolbarState);
    syncToolbarState();

    return () => {
      editor.off('selectionUpdate', syncToolbarState);
      editor.off('transaction', syncToolbarState);
    };
  }, [editor]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('이미지는 5MB 이하만 업로드할 수 있어요.');
      return;
    }
    const url = URL.createObjectURL(file);
    editor.chain().focus().setImage({ src: url }).run();
    e.target.value = '';
  };

  if (!editor) return null;

  const applyOnSelection = (apply: () => void) => {
    if (editor.state.selection.empty) {
      alert('스타일을 적용할 텍스트를 먼저 드래그해서 선택해주세요.');
      return;
    }
    apply();
  };

  const handleAddLink = () => {
    if (editor.state.selection.empty) {
      alert('링크를 연결할 텍스트를 먼저 드래그해서 선택해주세요.');
      return;
    }
    const url = window.prompt('연결할 링크 주소를 입력하세요 (예: https://example.com)');
    if (!url) return;
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const toolbarButtons = [
    {
      icon: <Undo2 size={14} />,
      action: () => editor.chain().focus().undo().run(),
      isActive: false,
      disabled: !editor.can().undo(),
      title: '실행 취소',
    },
    {
      icon: <Redo2 size={14} />,
      action: () => editor.chain().focus().redo().run(),
      isActive: false,
      disabled: !editor.can().redo(),
      title: '다시 실행',
    },
    { type: 'divider' },
    {
      icon: <Heading2 size={14} />,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: editor.isActive('heading', { level: 2 }),
      title: '제목 (큰)',
    },
    {
      icon: <Heading3 size={14} />,
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: editor.isActive('heading', { level: 3 }),
      title: '제목 (작은)',
    },
    { type: 'divider' },
    {
      icon: <Bold size={14} />,
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive('bold'),
      title: '굵게',
    },
    {
      icon: <Italic size={14} />,
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive('italic'),
      title: '기울임',
    },
    {
      icon: <UnderlineIcon size={14} />,
      action: () => editor.chain().focus().toggleUnderline().run(),
      isActive: editor.isActive('underline'),
      title: '밑줄',
    },
    {
      icon: <Strikethrough size={14} />,
      action: () => editor.chain().focus().toggleStrike().run(),
      isActive: editor.isActive('strike'),
      title: '취소선',
    },
    { type: 'divider' },
    {
      icon: <AlignLeft size={14} />,
      action: () => editor.chain().focus().setTextAlign('left').run(),
      isActive: editor.isActive({ textAlign: 'left' }),
      title: '왼쪽 정렬',
    },
    {
      icon: <AlignCenter size={14} />,
      action: () => editor.chain().focus().setTextAlign('center').run(),
      isActive: editor.isActive({ textAlign: 'center' }),
      title: '가운데 정렬',
    },
    {
      icon: <AlignRight size={14} />,
      action: () => editor.chain().focus().setTextAlign('right').run(),
      isActive: editor.isActive({ textAlign: 'right' }),
      title: '오른쪽 정렬',
    },
    { type: 'divider' },
    {
      icon: <List size={14} />,
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive('bulletList'),
      title: '글머리 기호',
    },
    {
      icon: <ListOrdered size={14} />,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive('orderedList'),
      title: '번호 목록',
    },
    {
      icon: <Quote size={14} />,
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: editor.isActive('blockquote'),
      title: '인용구',
    },
    {
      icon: <Minus size={14} />,
      action: () => editor.chain().focus().setHorizontalRule().run(),
      isActive: false,
      title: '구분선',
    },
    { type: 'divider' },
    {
      icon: <Link2 size={14} />,
      action: handleAddLink,
      isActive: editor.isActive('link'),
      title: '링크 삽입',
    },
  ];

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>상품 설명</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-5">
        <div className="border border-gray-200 rounded-md flex flex-col h-[500px]">
          {/* 툴바 */}
          <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-gray-50 rounded-t-md flex-wrap shrink-0">
            {/* 폰트 사이즈 셀렉터 */}
            <select
              value={activeFontSize}
              onChange={(e) =>
                applyOnSelection(() =>
                  editor.chain().focus().setMark('textStyle', { fontSize: e.target.value }).run()
                )
              }
              className="text-sm border border-gray-200 rounded px-1 py-0.5 text-gray-600 mr-1"
            >
              <option value="" disabled>
                크기
              </option>
              <option value="12px">12</option>
              <option value="14px">14</option>
              <option value="16px">16</option>
              <option value="18px">18</option>
              <option value="24px">24</option>
              <option value="32px">32</option>
            </select>

            {/* 글자 색 */}
            <input
              type="color"
              title="글자 색"
              value={activeColor}
              onChange={(e) =>
                applyOnSelection(() => editor.chain().focus().setColor(e.target.value).run())
              }
              className="w-6 h-6 rounded border border-gray-200 mr-1 cursor-pointer"
            />

            {/* 형광펜(배경색) */}
            <input
              type="color"
              title="형광펜"
              value={activeHighlight}
              onChange={(e) =>
                applyOnSelection(() =>
                  editor.chain().focus().toggleHighlight({ color: e.target.value }).run()
                )
              }
              className="w-6 h-6 rounded border border-gray-200 mr-1 cursor-pointer"
            />

            <Separator orientation="vertical" className="h-4 mx-1" />

            {toolbarButtons.map((btn, i) =>
              btn.type === 'divider' ? (
                <Separator key={i} orientation="vertical" className="h-4 mx-1" />
              ) : (
                <Button
                  key={i}
                  type="button"
                  title={btn.title}
                  onClick={btn.action}
                  variant={btn.isActive ? 'default' : 'ghost'}
                  size="icon-sm"
                  disabled={btn.disabled}
                >
                  {btn.icon}
                </Button>
              )
            )}
            <Button
              type="button"
              title="이미지 삽입"
              onClick={handleImageButtonClick}
              variant="ghost"
              size="icon-sm"
            >
              <ImageIcon size={14} />
            </Button>
          </div>

          {/* 에디터 */}
          <div className="overflow-y-auto flex-1 rounded-b-md">
            <EditorContent editor={editor} />
          </div>
        </div>

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />

        <p className="text-xs text-gray-400">
          블로그처럼 글을 작성하세요. 제목, 본문, 이미지를 자유롭게 배치하여 풍부한 상품 설명을 만들
          수 있어요. 이미지를 클릭하면 크기를 조절할 수 있어요.
        </p>
      </CardContent>
    </Card>
  );
}
